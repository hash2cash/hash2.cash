export function scrollToSection(sectionName) {
  if (typeof document === 'undefined' || !sectionName) {
    return;
  }
  const target = document.querySelector(`[data-scroll-target="${sectionName}"]`);
  if (!target) {
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
