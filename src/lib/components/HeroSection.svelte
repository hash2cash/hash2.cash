

<script>
  import { scrollToSection } from '../utils/scrollToSection.js';

  const handleStartMiningClick = (event) => {
    event.preventDefault();
    scrollToSection('generate');
  };
</script>

<section class="hero">
  <div class="container hero__inner">
    <div class="nomo"><div class="pill">Mine Smarter. Earn Transparently.</div></div>
    <div class="picons">
      <span class="coin flc"></span>
      <span class="coin doge"></span>
      <span class="coin bells"></span>
      <span class="coin pep"></span>
    </div>
    <h1>Transparent Mining Powered by Sharenotes.</h1>
    <h1 class="hidden">One hash. Multiple rewards.</h1>
    <!--<p>Merge mine $DOGE, $BELLS, $PEP and $FLC — with verifiable proof for every share you submit.</p>-->
    <p>Maximize your mining efficiency — merge mine multiple coins using the same energy, with verifiable proof for every share you submit.</p>
    <div class="cta-row s100btn">
      <a class="btn primary s100btn" href="/" on:click={handleStartMiningClick}>Start Mining</a>
      <a class="btn secondary" href="#dashboard">Track your shares</a>
    </div>
  </div>
</section>

<style>
  .hero {
    padding-top: 8rem;
    padding-bottom: 6rem;
        border-bottom: 1px solid rgba(189, 206, 255, 0.5);
    background: radial-gradient(circle at 20% 20%, rgba(115, 208, 255, 0.28), transparent 52%);
  }

  .hero__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    text-align: left;
  }

  h1 {
    font-size: clamp(2.6rem, 4vw, 2.4rem);
  }

  p {
    font-size: 1.1rem;
    color: rgba(10, 31, 51, 0.7);
  }

  @media (max-width: 880px) {
    h1 {
      font-size:1.7rem;
    }
    
    .cta-row {
      gap: 1rem;
      flex-direction: column;
      flex-wrap: wrap;
    }
    .lmore{
      background:transparent;
      padding:0;
      color: #334456 !important;
      font-weight:400;
    }
    .nomo{display:none}
  }
</style>
