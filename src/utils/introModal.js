// Utility functions for managing the intro modal

export const resetIntroModal = () => {
  localStorage.removeItem('dontShowIntro');
  sessionStorage.removeItem('hasSeenIntro');
  console.log('Intro modal reset. Refresh the page to see it again.');
};

export const showIntroModal = () => {
  localStorage.removeItem('dontShowIntro');
  sessionStorage.removeItem('hasSeenIntro');
  window.location.reload();
};

export const hideIntroModal = () => {
  localStorage.setItem('dontShowIntro', 'true');
  console.log('Intro modal hidden. It will not show again.');
};

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  window.resetIntroModal = resetIntroModal;
  window.showIntroModal = showIntroModal;
  window.hideIntroModal = hideIntroModal;
}
