<script>
  import { onMount, onDestroy } from 'svelte';
  import HeaderNav from '../lib/components/HeaderNav.svelte';
  import FooterSection from '../lib/components/FooterSection.svelte';
  import { getEventHash, signEvent, generatePrivateKey, getPublicKey } from 'nostr-tools';
  import {
    closeMergeMiningRelay,
    ensureMergeMiningRelay,
    fetchMergeMiningEvent,
    parseMergeMiningTags,
    MERGE_MINING_COINS,
    MERGE_MINING_COINS_MAP,
    MERGE_MINING_KIND,
  } from '../lib/utils/mergeMiningRelay.js';
  import { getFlcAddressError, getBase58AddressError } from '../lib/utils/addressValidation.js';
  const EPHEMERAL_PRIVATE_KEY = generatePrivateKey();
  const EPHEMERAL_PUBKEY = getPublicKey(EPHEMERAL_PRIVATE_KEY);

  let flcAddress = '';
  let coinInputs = MERGE_MINING_COINS.map((coin) => ({
    ...coin,
    address: '',
    signature: '',
  }));
  let submitting = false;
  let statusMessage = 'Connecting to merge-mining relay…';
  let statusError = '';
  let addressInputDisabled = true;
  let otherFieldsDisabled = true;
  let lookupState = 'idle';
  let lastCheckedAddress = '';
  let flcAddressError = '';
  let coinTouchedMap = {};
  let coinSignatureTouchedMap = {};
  let coinValidation = {};
  let coinErrorMap = {};
  let coinSignatureErrorMap = {};
  let formHasValidationErrors = false;
  let formFieldErrors = [];

  const updateCoinField = (id, field, value) => {
    coinInputs = coinInputs.map((entry) =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    if (field === 'address') {
      coinTouchedMap = { ...coinTouchedMap, [id]: true };
    }
    if (field === 'signature') {
      coinSignatureTouchedMap = { ...coinSignatureTouchedMap, [id]: true };
    }
  };

  const resetCoinInputs = () => {
    coinInputs = MERGE_MINING_COINS.map((coin) => ({
      ...coin,
      address: '',
      signature: '',
    }));
    coinTouchedMap = {};
    coinSignatureTouchedMap = {};
  };

  function fillCoinInputs(entries) {
    const mapped = entries.reduce((acc, entry) => {
      acc[entry.coinId] = entry;
      return acc;
    }, {});
    coinInputs = MERGE_MINING_COINS.map((coin) => {
      const match = mapped[coin.id];
      return {
        ...coin,
        address: match?.address ?? '',
        signature: match?.signature ?? '',
      };
    });
    coinTouchedMap = {};
    coinSignatureTouchedMap = {};
  }

  $: {
    coinValidation = coinInputs.reduce((acc, coin) => {
      const trimmedAddress = `${coin.address ?? ''}`.trim();
      const trimmedSignature = `${coin.signature ?? ''}`.trim();
      acc[coin.id] = {
        addressError: getBase58AddressError(trimmedAddress, {
          allowEmpty: false,
          label: coin.label,
        }),
        signatureError: trimmedSignature ? '' : 'Enter a signature.',
        addressHasValue: Boolean(trimmedAddress),
        signatureHasValue: Boolean(trimmedSignature),
      };
      return acc;
    }, {});
    coinErrorMap = Object.fromEntries(
      Object.entries(coinValidation).map(([id, info]) => [id, info.addressError])
    );
    coinSignatureErrorMap = Object.fromEntries(
      Object.entries(coinValidation).map(([id, info]) => [id, info.signatureError])
    );
    const fieldErrors = [];
    if (flcAddressError) {
      fieldErrors.push('FLC address is invalid.');
    }
    Object.entries(coinValidation).forEach(([id, info]) => {
      const label = MERGE_MINING_COINS_MAP[id]?.label ?? id;
      if (info.addressError && (coinTouchedMap[id] || info.addressHasValue)) {
        fieldErrors.push(`${label} address: ${info.addressError}`);
      }
      if (info.signatureError && (coinSignatureTouchedMap[id] || info.signatureHasValue)) {
        fieldErrors.push(`${label} signature: ${info.signatureError}`);
      }
    });
    formFieldErrors = fieldErrors;
    formHasValidationErrors = Boolean(fieldErrors.length) || Boolean(statusError);
  }

  $: allCoinsHaveAddress = coinInputs.every(
    (entry) => Boolean(`${entry.address ?? ''}`.trim())
  );

  async function checkExistingAddresses() {
    if (addressInputDisabled) {
      return;
    }
    const normalizedAddress = flcAddress.trim();
    const validationMessage = getFlcAddressError(normalizedAddress, { allowEmpty: false });
    if (validationMessage) {
      flcAddressError = validationMessage;
      statusError = '';
      statusMessage = '';
      lookupState = 'idle';
      lastCheckedAddress = '';
      otherFieldsDisabled = true;
      resetCoinInputs();
      return;
    }
    flcAddressError = '';
    statusError = '';
    if (normalizedAddress === lastCheckedAddress && lookupState !== 'error') {
      otherFieldsDisabled = false;
      return;
    }

    lastCheckedAddress = normalizedAddress;
    lookupState = 'checking';
    statusError = '';
    statusMessage = 'Looking up saved merge-mining payout addresses…';
    otherFieldsDisabled = true;

    try {
      const event = await fetchMergeMiningEvent(normalizedAddress);
      if (event) {
        const parsed = parseMergeMiningTags(event.tags);
        fillCoinInputs(parsed);
        lookupState = 'found';
        statusMessage = 'Loaded saved merge-mining payout addresses.';
      } else {
        resetCoinInputs();
        lookupState = 'not-found';
        statusMessage =
          'No saved merge-mining payout addresses found. Add addresses below to publish.';
      }
    } catch (error) {
      lookupState = 'error';
      statusError =
        error instanceof Error
          ? error.message
          : 'Unable to look up merge-mining payout addresses right now.';
      statusMessage = '';
    } finally {
      otherFieldsDisabled = false;
    }
  }

  async function initializeRelay() {
    try {
      await ensureMergeMiningRelay();
      statusMessage = 'Connected to the merge-mining relay.';
      statusError = '';
      addressInputDisabled = false;
      if (flcAddress.trim()) {
        await checkExistingAddresses();
      }
    } catch (error) {
      statusError =
        error instanceof Error
          ? error.message
          : 'Unable to connect to the merge-mining relay right now.';
      statusMessage = '';
      addressInputDisabled = true;
      otherFieldsDisabled = true;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    statusError = '';
    statusMessage = '';

    const normalizedAddress = flcAddress.trim();
    const flcValidationMessage = getFlcAddressError(normalizedAddress, { allowEmpty: false });
    if (flcValidationMessage) {
      flcAddressError = flcValidationMessage;
      statusError = '';
      statusMessage = '';
      return;
    }

    if (!allCoinsHaveAddress) {
      statusError = 'Fill DOGE, BELLS, and PEP payout addresses before publishing.';
      statusMessage = '';
      return;
    }

    const hasInvalidAddress = Object.values(coinErrorMap).some(Boolean);
    const hasInvalidSignature = Object.values(coinSignatureErrorMap).some(
      (error) => Boolean(error)
    );
    if (hasInvalidAddress || hasInvalidSignature) {
      statusError =
        hasInvalidSignature && !hasInvalidAddress
          ? 'Add missing signatures before publishing.'
          : 'Fix invalid payout addresses or signatures before publishing.';
      statusMessage = '';
      return;
    }

    const preparedCoins = coinInputs.map((entry) => ({
      ...entry,
      address: `${entry.address ?? ''}`.trim(),
      signature: `${entry.signature ?? ''}`.trim(),
    }));

    submitting = true;
    try {
      statusMessage = 'Signing your merge-mining addresses…';
      const tags = [
        ['a', normalizedAddress],
        ...preparedCoins.map((entry) => [
          entry.id,
          entry.address,
          entry.signature || '',
        ]),
      ];
      const unsignedEvent = {
        kind: MERGE_MINING_KIND,
        pubkey: EPHEMERAL_PUBKEY,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: 'Merge-mining payout addresses for Hash2Cash',
      };
      const eventWithId = {
        ...unsignedEvent,
        id: getEventHash(unsignedEvent),
      };
      const sig = await signEvent(eventWithId, EPHEMERAL_PRIVATE_KEY);
      const signedEvent = { ...eventWithId, sig };
      const relay = await ensureMergeMiningRelay();
      statusMessage = 'Publishing the event to the relay…';
      await relay.publish(signedEvent);
      statusMessage = 'Merge-mining addresses submitted to Nostr.';
    } catch (error) {
      statusError =
        error instanceof Error
          ? error.message
          : 'Unable to submit your merge mining addresses right now.';
      statusMessage = '';
    } finally {
      submitting = false;
    }
  }

  onMount(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const addressParam = params.get('address')?.trim();
    if (addressParam) {
      flcAddress = addressParam;
    }
    void initializeRelay();
  });

  onDestroy(() => {
    closeMergeMiningRelay();
  });
</script>

<HeaderNav />

<main class="page">
  <section>
    <div class="container">
      <div class="card merge-card p7">
        <h1>Merge mining payout addresses</h1>
        <p class="mb-2">
          Publish a Nostr event that links your Flokicoin wallet to the merged payout addresses
          you want to use for DOGE, BELLS, and PEP.
        </p>

        <form class="merge-form" on:submit={handleSubmit}>
          <fieldset class="group grp4 mb-1">
            <div class="grid two wal">
              <div class="field">
                <div class="relat">
              <span class="icon flc"></span>
                  <input
                    id="flc-address"
                    type="text"
                    placeholder="Your FLC Address"
                    bind:value={flcAddress}
                    autocomplete="off"
                    required
                    class="p124"
                    disabled={addressInputDisabled || submitting}
                    on:blur={() => void checkExistingAddresses()}
                    on:keydown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void checkExistingAddresses();
                      }
                    }}
                    on:input={() => {
                      flcAddressError = getFlcAddressError(flcAddress, { allowEmpty: true });
                      statusError = '';
                    }}
                />
              </div>
            </div>
          </div>
        </fieldset>
          {#each coinInputs as coin (coin.id)}
            <fieldset class="group grp4 mb-1">
              <div class="grid two wal">
                <div class="field">
                  <div class="relat">
                    <span class={`icon ${coin.icon}`}></span>
                      <input
                        id={`address-${coin.id}`}
                        type="text"
                        placeholder={`Your ${coin.label} Address`}
                        value={coin.address}
                        on:input={(event) =>
                          updateCoinField(coin.id, 'address', event.currentTarget.value)
                        }
                        autocomplete="off"
                        class="p124"
                        disabled={otherFieldsDisabled || submitting}
                    />
                </div>
              </div>
                <div class="field">
                    <input
                      id={`sig-${coin.id}`}
                      type="text"
                      placeholder="Signature"
                      value={coin.signature}
                      on:input={(event) =>
                        updateCoinField(coin.id, 'signature', event.currentTarget.value)
                      }
                      autocomplete="off"
                      disabled={otherFieldsDisabled || submitting}
                    />
                </div>
              </div>
            </fieldset>
          {/each}

          {#if statusMessage || statusError || formFieldErrors.length}
            <div class="form-feedback">
              {#if statusMessage}
                <p class="status-note form-note">
                  <span class="status-icon"></span>
                  {statusMessage}
                </p>
              {/if}
              {#if statusError}
                <p class="field-error">{statusError}</p>
              {/if}
              {#if formFieldErrors.length}
                <div class="form-feedback__card">
                  <ul class="form-feedback__list">
                    {#each formFieldErrors as message}
                      <li>{message}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/if}

          <div class="form-actions">
            <button
              class="btn primary w100btn br12"
              type="submit"
              disabled={submitting || otherFieldsDisabled || formHasValidationErrors}
            >
              {#if submitting}
                Publishing…
              {:else}
                Publish merge-mining event
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</main>

<FooterSection />

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding-bottom: 4rem;
  }

  .merge-card {
    box-shadow: none;
  }

  .merge-form {
    display: grid;
    gap: 1.4rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .field input {
    border: 1px solid rgba(10, 31, 51, 0.12);
    border-radius: 12px;
    padding: 0.9rem 1rem;
    font-size: 1rem;
    background: #fff;
    color: #0a1f33;
    width: 100%;
  }

  .field input:focus-visible {
    outline: 2px solid rgba(79, 70, 229, 0.6);
    outline-offset: 2px;
  }

  .group {
    background: #f5f7fc;
    background: linear-gradient(135deg, rgba(82, 136, 255, 0.12), rgba(249, 249, 249, 0.95));
    border: 0px solid rgba(188, 206, 255, 0.7);
    border-radius: 16px;
    padding: 14px;
  }

  .grp4 {
    padding: 6px;
  }

  .merge-form fieldset {
    border: none;
    margin: 0;
  }

  .grid.two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    align-items: flex-end;
  }

  .grid.wal {
    gap: 8px;
  }

  .relat {
    position: relative;
  }

  .relat .icon {
    position: absolute;
    top: 11px;
    left: 12px;
  }

  .p124 {
    padding: 12px 12px 12px 45px !important;
  }

  .field input::placeholder {
    color: rgba(10, 31, 51, 0.4);
  }

  .form-actions {
    margin-top: 0.2rem;
  }

  .status-note {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    background: rgba(240, 249, 255, 0.9);
    border: 1px solid rgba(96, 165, 250, 0.4);
    margin-bottom: 15px;
  }

  .status-note p {
    margin: 0;
    color: rgba(10, 31, 51, 0.85);
    font-size: 0.95rem;
  }

  .form-feedback__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .form-feedback__list li {
    font-size: 0.95rem;
    color: #b91c1c;
  }

  .form-feedback {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.4rem;
  }

  .form-note {
    margin: 0;
    padding: 0.7rem 0.85rem;
  }

  .form-feedback__card {
    border: 1px solid #f87171;
    background: rgba(248, 113, 113, 0.1);
    border-radius: 12px;
    padding: 0.75rem 1rem;
  }

  .form-feedback__card .form-feedback__list {
    gap: 0.35rem;
  }

  .status-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.85);
    display: inline-flex;
  }

  .field-error {
    color: #f87171;
    font-size: 0.9rem;
  }

  @media (max-width: 640px) {
    .grid.two {
      grid-template-columns: 1fr;
    }
  }
</style>
