<script>
  import { scrollToSection } from '../utils/scrollToSection.js';

  const handleGetStartedClick = (event) => {
    event.preventDefault();
    scrollToSection('generate');
  };
</script>

<footer>
  <div class="container">
    <div class="links">
      <a href="/" on:click={handleGetStartedClick}>Get started</a>
      <a href="/terms/">Terms</a>
      <a href="/privacy/">Privacy</a>
    </div>
    <div class="meta">Hash2Cash – Where every share counts.</div>
  </div>
</footer>
<style>
  footer .container {
    display: grid;
    gap: 1.4rem;
    justify-items: center;
    text-align: center;
  }

  .footer__logos {
    display: flex;
    gap: 0.9rem;
  }

  .logo {
    padding: 0.6rem 1rem;
    border-radius: 999px;
    border: 1px solid rgba(188, 206, 255, 0.6);
    background: rgba(245, 248, 255, 0.9);
    font-weight: 600;
    letter-spacing: 0.08em;
  }
</style>
