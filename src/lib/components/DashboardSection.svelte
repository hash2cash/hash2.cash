<script>
  import { getFlcAddressError } from '../utils/addressValidation.js';

  let minerAddress = '';
  let addressError = '';

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationError = getFlcAddressError(minerAddress, { allowEmpty: false });
    addressError = validationError;
    if (validationError) {
      return;
    }
    const targetUrl = `https://hashboard.hash2.cash/address/${encodeURIComponent(minerAddress.trim())}`;
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };
</script>

<section class="smt pbt0" id="dashboard">
  <div class="container">
    <div class="card dashboard">
      <div class="dashboard__copy">
        <h2>Real-Time Dashboard View</h2>
        <p>Every hash you submit creates a visible trail — Sharenotes make mining fair, provable, and fun to watch.</p>
      </div>
      <form class="dashboard__form" on:submit={handleSubmit}>
        <label for="miner">Miner address</label>
        <div class="dashboard__controls">
          <input
            id="miner"
            name="miner"
            type="text"
            bind:value={minerAddress}
            placeholder="Enter your FLC payout address"
            autocomplete="off"
            on:input={() => (addressError = '')}
          />
          
          <button class="btn primary br12" type="submit">Open hashboard</button>
        </div>
        {#if addressError}
          <p class="dashboard__error">{addressError}</p>
        {/if}
      </form>
    </div>
  </div>
</section>

<style>
  .dashboard {
    display: grid;
    gap: 1.8rem;
    background: linear-gradient(135deg, rgba(82, 136, 255, 0.12), rgba(255, 255, 255, 0.95));
  }

  .dashboard__form {

  }

  label {
    font-size: 0.9rem;
    text-transform: uppercase;
    color: rgba(10, 31, 51, 0.45);
    letter-spacing: 0.12em;
    cursor:pointer;
    display: inline-block;
    margin-bottom: 8px;
  }

  .dashboard__controls {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  @media (min-width: 640px) {
    .dashboard__controls {
      flex-direction: row;
      align-items: center;
    }
  }

  input {
    flex: 1;
    padding: 0.85rem 1.1rem;
    border-radius: 12px;
    border: 1px solid rgba(188, 206, 255, 0.7);
    background: rgba(255, 255, 255, 0.85);
    color: #0a1f33;
    font-size: 1rem;
  }

  input:focus {
    outline: 0;
  }
  .br12{border-radius: 12px;}
  .pbt0{padding:1rem}
  .dashboard__error {
    color: #d13b3b;
    font-size: 0.9rem;
  }
</style>
