<script>
  import { scrollToSection } from '../utils/scrollToSection.js';

  const flow = ['Miner', 'Share', 'Sharenote', 'Pool Ledger', 'Payout'];

  const handleStartMiningClick = (event) => {
    event.preventDefault();
    scrollToSection('generate');
  };
</script>

<section class="smt" id="sharenotes">
  <div class="container">
    <div class="pb-10 mcenter">
      <div class="pill">Your Proof of Contribution</div>
    </div>
    <div class="grid two">
      <div class="card2 sharenotes__copy">
        <h2 class="mcenter">What is a Sharenote?</h2>
        <p>
          Each time your miner submits valid work, Hash2Cash issues a Sharenote — a cryptographic receipt proving your contribution to the network.
        </p>
        <ul>
          <li><span>✅</span><span>Verifiable on-chain or via dashboard.</span></li>
          <li><span>✅</span><span>Immutable and timestamped.</span></li>
          <li><span>✅</span><span>Used for payout calculation under PPLNS.</span></li>
          <li><span>✅</span><span>Enables long-term performance tracking.</span></li>
        </ul>
        <div class="cta-row">
          <a class="btn primary sbtn" href="/" on:click={handleStartMiningClick}>Print Sharenotes</a>
          <a class="btn secondary sbtn" href="#dashboard">Track your Sharenotes</a>
        </div>
      </div>
      <div class="card2 sharenotes__flow">
        <img src="/sharenotes.gif" class="visual">
      </div>
    </div>
  </div>
</section>


<style>
  ul {
    list-style: none;
    display: grid;
    gap: 0.5rem;
    margin: 1.2rem 0;
    padding: 0;
  }
  ul li {
    display: flex;
    gap: 0.5rem;
    font-size:15px;
  }

  .sharenotes__copy {
    display: grid;
    gap: 1rem;
  }

  .sharenotes__flow {
    display: grid;
    gap: 1.4rem;
  }

  .flow {
    display: grid;
    gap: 0.9rem;
  }

  .flow__item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .node {
    padding: 0.55rem 1.3rem;
    border-radius: 999px;
    background: rgba(82, 136, 255, 0.12);
    border: 1px solid rgba(82, 136, 255, 0.3);
    color: #2456ce;
    font-weight: 600;
    animation: pulse 4s ease infinite;
  }

  .flow__item:nth-child(odd) .node {
    animation-delay: 1.2s;
  }

  .arrow {
    font-size: 1.3rem;
    color: rgba(10, 31, 51, 0.35);
  }

  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(82, 136, 255, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(82, 136, 255, 0);
    }
  }

  .visual{
    width: 100%;
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e5ecff;
  }

  @media (max-width: 880px) {
    .mcenter{text-align:center}
  }
</style>
