<script>
  let isMenuOpen = false;
 
  import { scrollToSection } from '../utils/scrollToSection.js';

  const links = [
    { href: '/#about', label: 'About' },
    { href: '/#dashboard', label: 'Hashboard' },
    { href: '/#faq', label: 'FAQ' }
  ];

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen;
  };

  const closeMenu = () => {
    isMenuOpen = false;
  };

  const getBaseOrigin = () =>
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin;

  const scrollToHash = (hash) => {
    if (!hash || typeof document === 'undefined') {
      return;
    }
    const anchorId = hash.startsWith('#') ? hash.slice(1) : hash;
    const target = document.getElementById(anchorId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAnchorNavClick = (event, href) => {
    closeMenu();
    if (!href || !href.includes('#')) {
      return;
    }
    const url = new URL(href, getBaseOrigin());
    const currentPath =
      typeof window === 'undefined' ? '/' : window.location.pathname;
    if (url.pathname === currentPath) {
      event.preventDefault();
      scrollToHash(url.hash);
    }
  };

  const handleStartMiningClick = (event) => {
    event.preventDefault();
    scrollToSection('generate');
    closeMenu();
  };
</script>

<header class="site-header">
  <div class="container header__inner">
    <a class="brand" href="/" on:click={closeMenu}>
      <span class="brand__name">Hash2Cash</span>
    </a>
    <button
      class="nav-toggle"
      type="button"
      aria-expanded={isMenuOpen}
      aria-controls="primary-navigation"
      on:click={toggleMenu}
    >
      <span class="sr-only">Toggle navigation</span>
      <span class:open={isMenuOpen} class="nav-toggle__bar" aria-hidden="true"></span>
    </button>

    <nav
      id="primary-navigation"
      class:open={isMenuOpen}
      aria-label="Primary navigation"
    >
      <ul>
        {#each links as link}
          <li>
            <a
              href={link.href}
              on:click={(event) => handleAnchorNavClick(event, link.href)}
            >
              {link.label}
            </a>
          </li>
        {/each}
        <li><a href="https://github.com/hash2cash" target="_blank" class="flex"><span class="github"></span></a></li>
      </ul>
      <a
        class="btn secondary header__cta"
        href="/"
        on:click={handleStartMiningClick}
      >
        Start Mining
      </a>
    </nav>
  </div>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(246, 248, 253, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(189, 206, 255, 0.5);
  }

  .header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
    gap: 1rem;
    position: relative;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #0a1f33;
  }

  .brand__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 34px;
    background: linear-gradient(180deg, #5288ff, #73d0ff);
    color: #ffffff;
    border-radius: 8px;
    font-weight: 700;
    font-size: 1rem;
  }

  .brand__name{
    font-size:20px;
  }

  .github{
    display:inline-block;
    background-image:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" data-astro-cid-3hxe222u=""><path d="M12 .5A11.5 11.5 0 0 0 .5 12.3c0 5.25 3.41 9.7 8.15 11.28.6.12.82-.27.82-.59 0-.29-.01-1.07-.02-2.1-3.32.73-4.02-1.64-4.02-1.64-.55-1.43-1.34-1.81-1.34-1.81-1.09-.77.08-.75.08-.75 1.2.09 1.83 1.26 1.83 1.26 1.07 1.86 2.8 1.32 3.49 1.01.11-.79.42-1.32 .76-1.63-2.65-.31-5.44-1.36-5.44-6.05 0-1.34.47-2.44 1.25-3.3-.13-.31-.54-1.56.12-3.26 0 0 1.01-.33 3.3 1.26.96-.27 1.99-.4 3.02-.4s2.06.14 3.02.4c2.29-1.59 3.3-1.26 3.3-1.26.67 1.7.25 2.95.12 3.26.78.86 1.25 1.96 1.25 3.3 0 4.71-2.8 5.74-5.46 6.04.44.38.82 1.12.82 2.25 0 1.62-.01 2.93-.01 3.33 0 .32.21.72.83.59 4.74-1.58 8.14-6.03 8.14-11.28A11.5 11.5 0 0 0 12 .5Z" data-astro-cid-3hxe222u=""></path></svg>');
    background-size:100%;
    width:20px;height:20px;
  }
  .flex{display:flex}

  nav {
    display: flex;
    align-items: center;
    gap: 2.2rem;
  }

  nav ul {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    list-style: none;
  }

  nav a {
    font-weight: 500;
    color: rgba(10, 31, 51, 0.72);
  }

  nav a:hover {
    color: #1c4ed8;
  }

  .header__cta {
    padding-inline: 1.4rem;
  }

  .nav-toggle {
    display: none;
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(82, 136, 255, 0.12);
    border: 1px solid rgba(188, 206, 255, 0.6);
  }

  .nav-toggle__bar {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 2px;
    background: #1c4ed8;
    transform: translate(-50%, -50%);
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .nav-toggle__bar::before,
  .nav-toggle__bar::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 2px;
    background: #1c4ed8;
    left: 0;
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .nav-toggle__bar::before {
    top: -6px;
  }

  .nav-toggle__bar::after {
    top: 6px;
  }

  .nav-toggle__bar.open {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  .nav-toggle__bar.open::before {
    transform: rotate(-90deg) translateX(-6px);
  }

  .nav-toggle__bar.open::after {
    transform: rotate(-90deg) translateX(6px);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  @media (max-width: 880px) {
    .nav-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    nav {
      position: absolute;
      top: calc(100% + 0.75rem);
      right: 0;
      left: 0;
      display: grid;
      gap: 1.4rem;
      padding: 1.5rem 1.4rem 2rem;
      background: rgba(246, 248, 253, 0.98);
      border-bottom: 1px solid rgba(189, 206, 255, 0.5);
      border-radius: 16px;
      box-shadow: 0 24px 44px -36px rgba(12, 46, 94, 0.55);
      translate: 0 -12px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    nav.open {
      opacity: 1;
      pointer-events: all;
      translate: 0 0;
    }

    nav ul {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .header__cta {
      justify-content: flex-start;
      width: fit-content;
    }
  }
</style>
