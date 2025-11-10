<script>
  import { tick, onDestroy } from 'svelte';
  import Tooltip from './Tooltip.svelte';
  import {
    estimateSharenote,
    planSharenoteFromHashrate,
    parseNoteLabel,
    noteFromComponents,
    HashrateUnit,
    ReliabilityId,
  } from '@soprinter/sharenotejs';
  import { getFlcAddressError } from '../utils/addressValidation.js';
  import {
    fetchMergeMiningEvent,
    parseMergeMiningTags,
    closeMergeMiningRelay,
  } from '../utils/mergeMiningRelay.js';

  const TARGET_SECONDS = 5;
  const DEFAULT_RELIABILITY = ReliabilityId.Mean;
  const MAX_SHARENOTE_LABEL = '256Z00';
  const MAX_SHARENOTE_ZBITS = noteFromComponents(256, 0).zBits;
  const MIN_SHARENOTE_LABEL = '1Z00';
  const MIN_SHARENOTE_ZBITS = noteFromComponents(1, 0).zBits;
  const HASHRATE_UNIT_MAP = {
    'H/s': HashrateUnit.Hps,
    'kH/s': HashrateUnit.KHps,
    'MH/s': HashrateUnit.MHps,
    'GH/s': HashrateUnit.GHps,
    'TH/s': HashrateUnit.THps,
    'PH/s': HashrateUnit.PHps,
    'EH/s': HashrateUnit.EHps,
  };
  const DEFAULT_NOTE = '0';
  const MERGE_MINING_PAGE = '/merge-mining';

  let wallet = '';
  let worker = '';
  let sharenote = '';
  let hashrate = '';
  let hashrateUnit = 'GH/s';
  let showNote = true;
  let showRate = false;
  let isHidden = true;
  let passType = 0;
  let buildCommand = () => '';
  let copied = false;

  let walletError = '';
  let sharenoteError = '';
  let hashrateError = '';

  let walletTouched = false;
  let sharenoteTouched = false;
  let hashrateTouched = false;

  let sharenoteBill = null;
  let hashratePlan = null;
  let parsedSharenoteLabel = '';
  let generatedNoteResult = null;
  let generatedRateResult = null;

  let walletInput;
  let sharenoteInput;
  let hashrateInput;
  let outputSection;
  let copiedField = '';
  let mergeMiningState = 'idle';
  let mergeMiningAddresses = [];
  let mergeMiningError = '';

  let stratumUrl = 'stratum+tcp://hash2.cash:3333';
  let sUser = '';
  let sPass = '';

  $: {
    const trimmed = wallet.trim();
    if (!trimmed) {
      walletError = '';
      setWalletValidity('');
    } else {
      const normalized = trimmed;
      if (wallet !== normalized) {
        wallet = normalized;
      } else {
        walletError = getFlcAddressError(normalized);
        setWalletValidity(walletError);
      }
    }
  }

  $: analyzeSharenoteInput(sharenote);
  $: setSharenoteValidity(showNote ? sharenoteError : '');

  $: planHashrateFromInput(hashrate, hashrateUnit);
  $: setHashrateValidity(showRate ? hashrateError : '');

  async function showSharenote() {
    isHidden = true;
    passType = 0;
    showNote = true;
    showRate = false;
    await tick();
    sharenoteTouched = false;
    sharenoteInput?.focus();
  }

  async function showHashrate() {
    isHidden = true;
    passType = 1;
    showNote = false;
    showRate = true;
    await tick();
    hashrateTouched = false;
    hashrateInput?.focus();
  }

  const resetCopyState = async () => {
    copied = true;
    await tick();
    setTimeout(() => {
      copied = false;
    }, 2400);
  };

  const walletHandle = () => wallet.trim() || 'FLC_WALLET';
  const workerHandle = () => worker.trim() || 'Worker1';

  async function copyInfo(value, label) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      copiedField = label;
      setTimeout(() => {
        if (copiedField === label) {
          copiedField = '';
        }
      }, 2000);
    } catch (error) {
      console.error('Unable to copy value', error);
    }
  }

  function handleCopyShortcut(event, value, label) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      copyInfo(value, label);
    }
  }

  const generateCommand = async () => {
    const isValid =
      passType === 0
        ? analyzeSharenoteInput(sharenote)
        : planHashrateFromInput(hashrate, hashrateUnit);

    if (!isValid) {
      if (passType === 0) {
        sharenoteTouched = true;
        setSharenoteValidity(sharenoteError);
      } else {
        hashrateTouched = true;
        setHashrateValidity(hashrateError);
      }
      return;
    }

    const normalizedWallet = wallet.trim();
    void checkMergeMiningAddresses(normalizedWallet);

    isHidden = false;
    sUser = `${walletHandle()}.${workerHandle()}`;
    const passNote =
      passType === 0
        ? getTargetSharenoteLabel()
        : getPlannedSharenoteLabel();
    sPass = `${passNote}`;
    buildCommand = () =>
      `${stratumUrl} -u ${walletHandle()}.${workerHandle()} -p ${sPass}`;

    if (passType === 0) {
      const noteLabel =
        sharenoteBill?.sharenote?.label ||
        parsedSharenoteLabel ||
        sharenote.trim().replace(/\s+/g, '').toUpperCase();
      generatedNoteResult = {
        label: noteLabel || '--',
        required: sharenoteBill?.requiredHashrateHuman?.display || '--',
      };
    } else {
      generatedRateResult = {
        planned: hashratePlan?.sharenote?.label || '--',
        input:
          hashratePlan?.inputHashrateHuman?.display ||
          (hashrate ? `${hashrate} ${hashrateUnit}` : '--'),
      };
    }

    await tick();
    scrollToOutputSection();
  };

  function scrollToOutputSection() {
    if (!outputSection || typeof window === 'undefined') {
      return;
    }

    const headerHeight =
      document.querySelector('.site-header')?.offsetHeight ?? 0;
    const padding = 16;
    const target =
      outputSection.getBoundingClientRect().top +
      window.scrollY -
      headerHeight -
      padding;

    window.scrollTo({ top: target, behavior: 'smooth' });
  }

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(buildCommand());
      resetCopyState();
    } catch (error) {
      console.error('Unable to copy miner settings', error);
    }
  };

  async function checkMergeMiningAddresses(address) {
    mergeMiningState = 'checking';
    mergeMiningAddresses = [];
    mergeMiningError = '';
    if (!address) {
      mergeMiningState = 'idle';
      return;
    }

    try {
      const event = await fetchMergeMiningEvent(address);
      if (!event) {
        mergeMiningState = 'not-found';
        return;
      }
      const parsed = parseMergeMiningTags(event.tags);
      if (parsed.length) {
        mergeMiningAddresses = parsed;
        mergeMiningState = 'found';
      } else {
        mergeMiningState = 'not-found';
      }
    } catch (error) {
      mergeMiningState = 'error';
      mergeMiningError =
        error instanceof Error ? error.message : 'Unable to fetch merge mining data.';
    }
  }

  onDestroy(() => {
    closeMergeMiningRelay();
  });

  function navigateToMergeMiningPage() {
    if (typeof window === 'undefined') {
      return;
    }
    const targetUrl = new URL(MERGE_MINING_PAGE, window.location.origin);
    const normalized = wallet.trim();
    if (normalized) {
      targetUrl.searchParams.set('address', normalized);
    }
    window.location.href = targetUrl.href;
  }

  function setWalletValidity(message) {
    if (walletInput) {
      walletInput.setCustomValidity(message || '');
    }
  }

  function setSharenoteValidity(message) {
    if (sharenoteInput) {
      sharenoteInput.setCustomValidity(message || '');
    }
  }

  function setHashrateValidity(message) {
    if (hashrateInput) {
      hashrateInput.setCustomValidity(message || '');
    }
  }

  function getTargetSharenoteLabel(forDisplay = false) {
    if (sharenoteBill?.sharenote?.label) {
      return sharenoteBill.sharenote.label;
    }
    if (parsedSharenoteLabel) {
      return parsedSharenoteLabel;
    }

    const cleaned = sharenote.trim().replace(/\s+/g, '').toUpperCase();
    if (cleaned) {
      return cleaned;
    }
    return forDisplay ? '--' : DEFAULT_NOTE;
  }

  function getPlannedSharenoteLabel(forDisplay = false) {
    if (hashratePlan?.sharenote?.label) {
      return hashratePlan.sharenote.label;
    }
    return forDisplay ? '--' : DEFAULT_NOTE;
  }

  function analyzeSharenoteInput(inputValue) {
    const trimmed = `${inputValue ?? ''}`.trim();
    sharenoteBill = null;
    parsedSharenoteLabel = '';
    if (!trimmed) {
      sharenoteError = '';
      return false;
    }
    try {
      const normalizedNote = trimmed.replace(/\s+/g, '').toUpperCase();
      const parsed = parseNoteLabel(normalizedNote);
      const canonical = noteFromComponents(parsed.z, parsed.cents);
      if (canonical.zBits > MAX_SHARENOTE_ZBITS) {
        sharenoteError = `Maximum supported sharenote is ${MAX_SHARENOTE_LABEL}.`;
        return false;
      }
      if (canonical.zBits < MIN_SHARENOTE_ZBITS) {
        sharenoteError = `Minimum supported sharenote is ${MIN_SHARENOTE_LABEL}.`;
        return false;
      }
      parsedSharenoteLabel = canonical.label;
      sharenoteBill = estimateSharenote(canonical, TARGET_SECONDS, {
        reliability: DEFAULT_RELIABILITY,
      });
      sharenoteError = '';
      return true;
    } catch (error) {
      sharenoteError =
        error instanceof Error ? error.message : 'Invalid sharenote';
      return false;
    }
  }

  function planHashrateFromInput(value, unitLabel) {
    const raw = `${value ?? ''}`.trim();
    hashratePlan = null;
    if (!raw) {
      hashrateError = '';
      return false;
    }
    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      hashrateError = 'Enter a positive hashrate.';
      return false;
    }
    const unit = HASHRATE_UNIT_MAP[unitLabel];
    if (!unit) {
      hashrateError = 'Select a hashrate unit.';
      return false;
    }
    try {
      const plan = planSharenoteFromHashrate({
        hashrate: { value: numericValue, unit },
        seconds: TARGET_SECONDS,
        reliability: DEFAULT_RELIABILITY,
      });
      if (plan.sharenote.zBits > MAX_SHARENOTE_ZBITS) {
        hashrateError = `Hashrate must target a sharenote ≤ ${MAX_SHARENOTE_LABEL}.`;
        return false;
      }
      if (plan.sharenote.zBits < MIN_SHARENOTE_ZBITS) {
        hashrateError = `Hashrate must target a sharenote ≥ ${MIN_SHARENOTE_LABEL}.`;
        return false;
      }
      hashratePlan = plan;
      hashrateError = '';
      return true;
    } catch (error) {
      hashrateError =
        error instanceof Error ? error.message : 'Unable to plan sharenote.';
      return false;
    }
  }

  function handleToggleKey(event, mode) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (mode === 'hashrate') {
        showHashrate();
      } else {
        showSharenote();
      }
    }
  }
</script>


<section data-scroll-target="generate">
  <div class="container">
    <div class="card generator">
      <div class="generator__intro">
        <div><span class="pill">Get Started</span></div>
        <h2>Generate your ready-to-use miner settings in seconds.</h2>
        <p class="hidden">
          Enter your wallet address and worker name, then set your <span class="btn1" on:click={showSharenote}>Target&nbsp;Sharenote</span> or <span class="btn1" on:click={showHashrate}>Hashrate</span> to generate a full connection command ready to paste into your miner.
        </p>

        <p>
          To get settings, enter your FLC address and worker name, then set a <span class="btn1" on:click={showSharenote}>Target&nbsp;Sharenote</span> or a <span class="btn1" on:click={showHashrate}>Hashrate</span>.
        </p>



        <div class="hidden">
          <p>To get settings, </p>
          <ul class="txt">
          <li>Enter your FLC address and worker name.</li>
          <li>Set your <span class="btn1" on:click={showSharenote}>Target Sharenote</span> or <span class="btn1" on:click={showHashrate}>Hashrate</span></li>
          </ul>
        </div>
        
      </div>

      <form class="generator__form" on:submit|preventDefault={generateCommand}>
        <div class="grid two">
          <div class="field">
            <label for="wallet">
              Your FLC Wallet Address
              <Tooltip text="Rewards are sent directly to this address.">
                <span class="tooltip">?</span>
              </Tooltip>
            </label>
            <span class="relat">
              <label for="wallet"><span class="icon flc"></span></label>
              <input
                id="wallet"
                name="wallet"
                type="text"
                class="p124"
                placeholder="FLC Address"
                spellcheck="false"
                bind:value={wallet}
                bind:this={walletInput}
                autocomplete="off"
                required
                on:blur={() => (walletTouched = true)}
              />
            </span>
            {#if walletError && walletTouched}
              <p class="field-error" aria-live="polite">{walletError}</p>
            {/if}
          </div>
          <div class="field">
            <label for="worker">
              Worker Name
              <Tooltip text="worker name help">
                <span class="tooltip">?</span>
              </Tooltip>
            </label>
            <input
              id="worker"
              name="worker"
              type="text"
              placeholder="rig1, homefarm01"
              bind:value={worker}
              autocomplete="off"
              required
            />
          </div>
        </div>

{#if showNote}
        <div class="grid two">
          <div class="field">
          <div class="label-row">
            <label for="sharenote" class="field-label">
              <span class="label-main">
                Target Sharenote
              </span>
              <span
                role="button"
                class="label-toggle"
                tabindex="0"
                on:click={showHashrate}
                on:keydown={(event) => handleToggleKey(event, 'hashrate')}
                aria-label="Switch to hashrate input"
              >
                Hashrate ?
              </span>
            </label>
          </div>

            <div>
              <input
                id="sharenote"
                name="sharenote"
                type="text"
                class="mw200"
                placeholder="e.g. 33Z00"
                bind:value={sharenote}
                bind:this={sharenoteInput}
                spellcheck="false"
                autocomplete="off"
                required
                on:blur={() => (sharenoteTouched = true)}
              />
            </div>
            {#if sharenoteError && sharenoteTouched && showNote}
              <p class="field-error" aria-live="polite">{sharenoteError}</p>
            {/if}
            <div class="hint pt-x1">
              <span>✨</span>
              <p>Use <a href="http://planner.sharenote.xyz" target="_blank" class="btn1">Sharenote Print Planner</a> to calculate target sharenote you can print using a given hashrate.</p>
            </div>
          </div>
        </div>
{/if}

{#if showRate}
        <div class="grid two">
          <div class="field">
          <div class="label-row">
            <label for="hashrate" class="field-label">
              <span class="label-main">
                Average hashrate
              </span>
              <span
                role="button"
                class="label-toggle"
                tabindex="0"
                on:click={showSharenote}
                on:keydown={(event) => handleToggleKey(event, 'sharenote')}
                aria-label="Switch to target sharenote input"
              >
                Sharenote ?
              </span>
            </label>
          </div>

            <div>
              <input
                id="hashrate"
                name="hashrate"
                type="number"
                min="0"
                step="0.01"
                class="mw130"
                placeholder=""
                bind:value={hashrate}
                bind:this={hashrateInput}
                spellcheck="false"
                autocomplete="off"
                required
                on:blur={() => (hashrateTouched = true)}

              />
              <select class="mw100" id="hashrateUnit" bind:value={hashrateUnit}>
                <option>H/s</option>
                <option>kH/s</option>
                <option>MH/s</option>
                <option>GH/s</option>
                <option>TH/s</option>
                <option>PH/s</option>
                <option>EH/s</option>
              </select>
            </div>
            {#if hashrateError && hashrateTouched && showRate}
              <p class="field-error" aria-live="polite">{hashrateError}</p>
            {/if}
          </div>
        </div>
{/if}

       


        <div class="center">
          <button class="btn primary w100btn br12" type="submit">Get Settings</button>
        </div>

      </form>

      <div class="output" class:hidden={isHidden} bind:this={outputSection}>
        <div class="note">
          <span class="info"></span>
          {#if showNote}
            <p class="note__text">
              {#if generatedNoteResult}
                To print <strong>{generatedNoteResult.label}</strong> every <strong>~{TARGET_SECONDS}s</strong>, your average hashrate should be at least <strong>{generatedNoteResult.required}</strong>.
              {:else}
                Enter a target sharenote above to preview the required hashrate.
              {/if}
            </p>
          {/if}

          {#if showRate}
            <p class="note__text">
              {#if generatedRateResult}
                At <strong>{generatedRateResult.input}</strong> average hashrate, you can print <strong>{generatedRateResult.planned}</strong> every <strong>~{TARGET_SECONDS}s</strong>.
              {:else}
                Provide your average hashrate to see how often you can print.
              {/if}
            </p>
          {/if}
        </div>

         {#if mergeMiningState !== 'idle'}
          <div class="merge-suggestions" aria-live="polite">
            {#if mergeMiningState === 'checking'}
              <p class="note__text">Looking up existing merge-mining payout addresses for this wallet…</p>
            {:else if mergeMiningState === 'found'}
              <div class="merge-suggestions__header">
                <p>We already have merge-mining payout addresses linked to this wallet.</p>
                <button
                  type="button"
                  class="btn merge-suggestions__cta"
                  on:click={navigateToMergeMiningPage}
                >
                  Update addresses
                </button>
              </div>
              <div class="merge-suggestions__grid">
                {#each mergeMiningAddresses as entry}
                  <div class="merge-suggestion">
                    <div class="merge-suggestion__title">
                      <span>{entry.label}</span>
                      <small>{entry.coinId}</small>
                    </div>
                    <div class="merge-suggestion__address" title={entry.address}>
                      {entry.address}
                    </div>
                    {#if entry.signature}
                      <div class="merge-suggestion__signature">
                        sig {entry.signature.slice(0, 8)}…{entry.signature.slice(-4)}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else if mergeMiningState === 'not-found'}
              <div class="merge-suggestions__info">
                <p class="note__text">
                  We could not find saved merge-mining payout addresses for this wallet yet.
                </p>
                <button
                  type="button"
                  class="btn merge-suggestions__cta"
                  on:click={navigateToMergeMiningPage}
                >
                  Add them now
                </button>
              </div>
            {:else if mergeMiningState === 'error'}
              <p class="field-error">
                {mergeMiningError || 'Unable to reach the merge mining relay right now.'}
              </p>
            {/if}
          </div>
        {/if}

        <div>
          <div class="setkey">Stratum URL</div>
          <div class="setvalue">
            <div class="setval">{stratumUrl}</div>
            <span
              class="setcopy"
              role="button"
              tabindex="0"
              aria-label="Copy stratum URL"
              on:click={() => copyInfo(stratumUrl, 'Stratum URL')}
              on:keydown={(event) => handleCopyShortcut(event, stratumUrl, 'Stratum URL')}
            ></span>
          </div>
          <div class="setkey">Username</div>
          <div class="setvalue">
            <div class="setval">{sUser}</div>
            <span
              class="setcopy"
              role="button"
              tabindex="0"
              aria-label="Copy miner username"
              on:click={() => copyInfo(sUser, 'Username')}
              on:keydown={(event) => handleCopyShortcut(event, sUser, 'Username')}
            ></span>
          </div>
          <div class="setkey">Password</div>
          <div class="setvalue">
            <div class="setval">{sPass}</div>
            <span
              class="setcopy"
              role="button"
              tabindex="0"
              aria-label="Copy miner password"
              on:click={() => copyInfo(sPass, 'Password')}
              on:keydown={(event) => handleCopyShortcut(event, sPass, 'Password')}
            ></span>
          </div>
        </div>
        
        <div class="command-block">
          <p class="command-hint">Paste this command into your miner's CLI to start hashing.</p>
          <div class="command-shell">
            <pre><code id="command">{buildCommand()}</code></pre>
            <button class="command-copy" type="button" on:click={copyCommand} aria-label="Copy command">
              {#if copied}
                Copied!
              {:else}
                Copy
              {/if}
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

<style>
  ul{
    padding-left:1.2rem;
  }
  .field-error {
    color: #f87171;
    font-size: 0.85rem;
    margin-top: 0.4rem;
  }
  .generator {
    display: grid;
    gap: 2.5rem;
    padding:7rem;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-wrap: anywhere;
  }

  .card.generator {
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 1024px) {
    .generator {
      padding: 4rem;
    }
  }

  @media (max-width: 768px) {
    .generator {
      padding: 2.5rem;
    }
  }

  @media (max-width: 560px) {
    .generator {
      padding: 1.5rem;
    }
  }

  .generator__intro {
    display: grid;
    gap: 1rem;
  }

  .generator__form {
    display: grid;
    gap: 2rem;
  }

  .coin-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .coin-option {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: 14px;
    border: 1px solid rgba(188, 206, 255, 0.8);
    background: rgba(255, 255, 255, 0.96);
    cursor: pointer;
    transition: border 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  }

  .coin-option:hover {
    border-color: rgba(82, 136, 255, 0.6);
    box-shadow: 0 12px 24px -20px rgba(12, 46, 94, 0.35);
  }

  .coin-option.active {
    border-color: transparent;
    background: linear-gradient(135deg, rgba(82, 136, 255, 0.1), rgba(115, 208, 255, 0.18));
    box-shadow: 0 16px 30px -24px rgba(82, 136, 255, 0.7);
  }

  .coin-option input {
    width: 18px;
    height: 18px;
    accent-color: #1c4ed8;
  }

  .coin-option__visual {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
  }

  .coin-option__visual strong {
    display: block;
    font-size: 1rem;
    color: #0a1f33;
    line-height: 1.1;
  }

  .coin-option__visual small {
    display: block;
    font-size: 0.8rem;
    color: rgba(10, 31, 51, 0.55);
  }

  .coin-option input:checked + .coin-option__visual strong {
    color: #1c4ed8;
  }

  .grid.two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    align-items: flex-start;
  }

  @media (max-width: 640px) {
    .grid.two {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .grid.wal{
    gap: 8px;
  }

  .field {
    display: grid;
    gap: 0.5rem;
  }

  .field label {
    font-weight: 600;
    color: rgba(10, 31, 51, 0.8);
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .field__hint {
    font-size: 0.82rem;
    color: rgba(10, 31, 51, 0.55);
    margin-top: -0.35rem;
  }

  .optional {
    font-weight: 500;
    color: rgba(10, 31, 51, 0.45);
    font-size: 0.9rem;
  }

  .label-row {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.15rem;
    flex-wrap: wrap;
  }

  .field-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
    color: rgba(10, 31, 51, 0.8);
  }

  

  .label-toggle {
    border: none;
    background: transparent;
    padding: 0.15rem 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(10, 31, 51, 0.65);
    border-radius: 999px;
    border-bottom: 1px solid transparent;
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease;
      border-color: rgba(10, 31, 51, 0.2);
  }

  .label-toggle:focus-visible {
    outline: 2px solid rgba(37, 99, 235, 0.8);
    outline-offset: 2px;
  }

  @media (max-width: 520px) {
    .label-row {
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .label-toggle {
      flex: 1;
      min-width: 140px;
      text-align: center;
    }
  }

  .tooltip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(82, 136, 255, 0.12);
    border: 1px solid rgba(82, 136, 255, 0.2);
    font-size: 0.75rem;
    color: #1c4ed8;
  }

  input, select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 100%;
    padding: 0.75rem 1.05rem;
    border-radius: 12px;
    border: 1px solid rgba(188, 206, 255, 0.8);
    background: rgba(255, 255, 255, 0.95);
    color: #0a1f33;
    font-size: 1rem;
  }

  input:focus, select:focus {
    outline: 0;
  }

  select{
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 3px center;
    background-size: auto 80%;
    padding-right: 24px;
  }

  .output {
    display: grid;
    gap: 1rem;
    /* background: rgba(246, 248, 253, 0.92); */
    /* border: 1px solid rgba(188, 206, 255, 0.7); */
    /* border-radius: 16px; */
    /* padding: 1.5rem; */
  }

  .command-block {
    display: grid;
    gap: 0.75rem;
  }

  .command-hint {
    font-size: 0.95rem;
    color: rgba(10, 31, 51, 0.75);
  }

  .command-shell {
    position: relative;
    background: rgba(17, 24, 39, 0.85);
    border-radius: 12px;
    padding: 1rem 3.5rem 1rem 1.2rem;
    overflow-x: auto;
  }

  .command-copy {
    position: absolute;
    right: 0.8rem;
    transform: translateY(-50%);
    top: 50%;
    border: none;
    background: #1c4ed8;
    color: #fff;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.45rem 0.95rem;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.18s ease, box-shadow 0.18s ease;
  }

  .command-copy:hover {
    background: #1537a8;
    box-shadow: 0 8px 16px -10px rgba(28, 78, 216, 0.5);
  }

  .command-shell pre {
    background: transparent;
    padding: 0;
    margin: 0;
    min-width: 0;
    width: 100%;
  }

  @media (max-width: 480px) {
    .command-shell {
      padding-right: 1.2rem;
      padding-bottom: 3rem;
    }

    .command-copy {
      top: auto;
      bottom: 0.8rem;
      transform: none;
    }
  }

  pre {
    background: #111827;
    color: #f9fafb;
    padding: 1.1rem 1.2rem;
    border-radius: 12px;
    font-size: 0.95rem;
    overflow-x: auto;
    max-width: 100%;
  }

  pre code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }

.relat{
  position:relative;
}


.p124{padding:12px 12px 12px 45px;}
.mw200{max-width:200px}
.mw130{max-width:130px}
.mw100{max-width:100px}
.pt-x1{margin-top:5px}


.group{
  background: #f5f7fc;
  background: linear-gradient(135deg, rgba(82, 136, 255, 0.12), rgba(249, 249, 249, 0.95));
  border: 0px solid rgba(188, 206, 255, 0.7);
  border-radius: 16px;
  padding: 14px;
}

.grp4{
  padding: 6px;
}

.btn1{
  font-weight:600;
  text-decoration:underline;
  color:#1c4ed8;
  cursor:pointer;
}

.setkey{
  text-transform: uppercase;
  font-size: 13px;
  color: #00000080;
}

  .setvalue{
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .setval{
    font-weight: 600;
    flex: 0 1 auto;
    min-width: 0;
    max-width: calc(100% - 32px);
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .setcopy{
    background-image:url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2C2.895 2 2 2.895 2 4v14h2V4h14V2H4zM8 6C6.895 6 6 6.895 6 8v12c0 1.105.895 2 2 2h12c1.105 0 2-.895 2-2V8c0-1.105-.895-2-2-2H8zm0 2h12v12H8V8z' fill='rgb(84 143 255)'/%3E%3C/svg%3E");
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center;
    width:16px;
    height:16px;
    display:inline-block;
    cursor:pointer;
    flex-shrink: 0;
  }

.setcopy:focus-visible{
  outline: 2px solid #1c4ed8;
  outline-offset: 4px;
}

@media (max-width: 640px) {
  .setvalue {
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }

  .setval {
    flex: 1 1 auto;
    max-width: calc(100% - 32px);
  }

  .setcopy {
    margin-left: auto;
  }
}

  .note{
    background: #ccf8cc;
    color: #00000099;
    font-size: .9rem;
    padding: 1rem;
    border-radius: 10px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    align-items: center;
  }

  .note__text {
    margin: 0;
    font-size: 0.9rem;
    color: #00000099;
    min-width: 0;
  }

  .note__text strong {
    font-weight: 700;
    color: #0a1f33;
  }

  @media (max-width: 520px) {
    .note {
      grid-template-columns: auto 1fr;
    }
  }

.info{
  background:url('data:image/svg+xml,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect width="24" height="24" stroke="none" fill="%23000000" opacity="0"/><g transform="matrix(1.43 0 0 1.43 12 12)" ><g style="" ><g transform="matrix(1 0 0 1 0 0)" ><circle style="stroke: rgb(0,0,0); stroke-width: 1; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;" cx="0" cy="0" r="6.5" /></g><g transform="matrix(1 0 0 1 0 1.75)" ><line style="stroke: rgb(0,0,0); stroke-width: 1; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;" x1="0" y1="-1.75" x2="0" y2="1.75" /></g><g transform="matrix(1 0 0 1 0 -2.5)" ><circle style="stroke: rgb(0,0,0); stroke-width: 1; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 4; fill: none; fill-rule: nonzero; opacity: 1;" cx="0" cy="0" r="0.5" /></g></g></g></svg>');
  background-size:100%;
  display:inline-block;
  width:16px;
  min-width: 16px;
  height:16px;
}

.hint{
  display:flex;
  gap:6px;
  font-size: 15px;
}

.pt5p{padding-top:4px}

.group legend{
  font-weight: 600;
  color: rgba(10, 31, 51, 0.8);
}



  .merge-suggestions {
    background: rgba(247, 249, 255, 0.8);
    border: 1px solid rgba(147, 197, 253, 0.6);
    border-radius: 14px;
    padding: 1.25rem;
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .merge-suggestions__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .merge-suggestions__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.9rem;
  }

  .merge-suggestion {
    border-radius: 12px;
    border: 1px solid rgba(147, 197, 253, 0.4);
    padding: 0.85rem 1rem;
    background: #ffffff;
    box-shadow: 0 12px 24px -20px rgba(12, 46, 94, 0.35);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .merge-suggestion__title {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    font-weight: 600;
  }

  .merge-suggestion__title small {
    font-size: 0.8rem;
    color: rgba(10, 31, 51, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }

  .merge-suggestion__address {
    font-weight: 600;
    color: #0a1f33;
    word-break: break-all;
    font-size: 0.95rem;
  }

  .merge-suggestion__signature {
    font-size: 0.8rem;
    color: rgba(10, 31, 51, 0.6);
  }

  .merge-suggestions__info {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .merge-suggestions__cta {
    padding: 0.6rem 1.4rem;
    font-size: 0.95rem;
    border-radius: 999px;
  }

  @media (max-width: 640px) {
    .output__header {
      flex-direction: column;
      align-items: center;
    }

    .output__header button {
      width:100%;
    }

    .output__actions {
      flex-direction: column;
    }

    .generator {
      padding:1.4rem;
    }
  }
</style>
