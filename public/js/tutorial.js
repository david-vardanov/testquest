/**
 * TestQuest Tutorial Tour
 * Guided tour for first-time users
 */

(function() {
  'use strict';

  // Tutorial steps configuration
  const tutorialSteps = [
    {
      target: null, // No target - welcome modal
      title: 'Welcome to TestQuest!',
      content: 'This quick tour will show you how to use the testing platform and earn points. Let\'s get started!',
      position: 'center'
    },
    {
      target: '#flows-section',
      title: 'Test Flows',
      content: 'These are your available test flows. Each flow contains multiple test cases that you need to complete. Click on a flow to start testing!',
      position: 'right'
    },
    {
      target: '.flow-card-example',
      title: 'Understanding Flow Cards',
      content: 'Each card shows the flow name, number of tests, and total points available. Your progress bar shows how many tests you\'ve completed.',
      position: 'bottom'
    },
    {
      target: '#rank-card',
      title: 'Your Rank & Points',
      content: 'Here you can see your current rank on the leaderboard and total points earned. Complete more tests and find bugs to climb higher!',
      position: 'left'
    },
    {
      target: '#leaderboard-section',
      title: 'Leaderboard & Rewards',
      content: 'See how you compare to other testers! The "Reward" column shows what prize each position will receive at the end of the season.',
      position: 'left'
    },
    {
      target: '#practice-flow-card',
      title: 'Start with Practice!',
      content: 'We recommend starting with the Practice Flow to learn how testing works. It won\'t affect your points - it\'s just for learning!',
      position: 'bottom'
    },
    {
      target: null,
      title: 'Points System',
      content: '<strong>How to earn points:</strong><br>Base completion: varies by test difficulty<br>Finding a bug: +3 pts<br>Adding feedback: +1 pt<br>Uploading screenshot: +1 pt<br>Flow completion bonus: +3 pts (when all tests approved)<br><br>Harder tests = more base points. Maximize on every test!',
      position: 'center'
    },
    {
      target: null,
      title: 'You\'re Ready!',
      content: 'That\'s it! Start with the Practice Flow to get hands-on experience, then tackle the real test flows. Good luck!',
      position: 'center'
    }
  ];

  let currentStep = 0;
  let overlay = null;
  let tooltip = null;

  /**
   * Initialize the tutorial
   */
  function initTutorial() {
    // Check if tutorial should run
    if (!window.shouldShowTutorial) {
      return;
    }

    // Create overlay element
    overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    overlay.id = 'tutorial-overlay';
    document.body.appendChild(overlay);

    // Create tooltip element
    tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';
    tooltip.id = 'tutorial-tooltip';
    document.body.appendChild(tooltip);

    // Start the tour
    showStep(0);
  }

  /**
   * Show a specific tutorial step
   */
  function showStep(stepIndex) {
    currentStep = stepIndex;
    const step = tutorialSteps[stepIndex];

    // Remove previous highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    // Find and highlight target element
    let targetEl = null;
    if (step.target) {
      targetEl = document.querySelector(step.target);
    }

    if (targetEl) {
      targetEl.classList.add('tutorial-highlight');
      overlay.style.display = 'block';
    } else {
      overlay.style.display = 'block';
    }

    // Build tooltip content
    const isLastStep = stepIndex === tutorialSteps.length - 1;
    const isFirstStep = stepIndex === 0;

    tooltip.innerHTML = `
      <div class="tutorial-tooltip-header">
        <span class="tutorial-tooltip-title">${step.title}</span>
        <span class="tutorial-tooltip-step">${stepIndex + 1}/${tutorialSteps.length}</span>
      </div>
      <div class="tutorial-tooltip-content">${step.content}</div>
      <div class="tutorial-tooltip-buttons">
        <button class="tutorial-btn tutorial-btn-skip" onclick="TutorialTour.skip()">
          ${isLastStep ? '' : 'Skip Tour'}
        </button>
        <button class="tutorial-btn tutorial-btn-next" onclick="TutorialTour.${isLastStep ? 'complete' : 'next'}()">
          ${isLastStep ? 'Get Started!' : 'Next'}
        </button>
      </div>
      ${getArrowClass(step.position)}
    `;

    // Position tooltip
    positionTooltip(targetEl, step.position);

    // Show tooltip
    tooltip.style.display = 'block';
  }

  /**
   * Get arrow HTML based on position
   */
  function getArrowClass(position) {
    switch(position) {
      case 'top': return '<div class="tutorial-arrow tutorial-arrow-bottom"></div>';
      case 'bottom': return '<div class="tutorial-arrow tutorial-arrow-top"></div>';
      case 'left': return '<div class="tutorial-arrow tutorial-arrow-right"></div>';
      case 'right': return '<div class="tutorial-arrow tutorial-arrow-left"></div>';
      default: return '';
    }
  }

  /**
   * Position the tooltip relative to target
   */
  function positionTooltip(targetEl, position) {
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 20;

    if (!targetEl || position === 'center') {
      // Center in viewport
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    tooltip.style.transform = 'none';
    const targetRect = targetEl.getBoundingClientRect();

    switch(position) {
      case 'top':
        tooltip.style.top = (targetRect.top - tooltipRect.height - padding + window.scrollY) + 'px';
        tooltip.style.left = (targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)) + 'px';
        break;
      case 'bottom':
        tooltip.style.top = (targetRect.bottom + padding + window.scrollY) + 'px';
        tooltip.style.left = (targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)) + 'px';
        break;
      case 'left':
        tooltip.style.top = (targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2) + window.scrollY) + 'px';
        tooltip.style.left = (targetRect.left - tooltipRect.width - padding) + 'px';
        break;
      case 'right':
        tooltip.style.top = (targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2) + window.scrollY) + 'px';
        tooltip.style.left = (targetRect.right + padding) + 'px';
        break;
    }

    // Keep tooltip in viewport
    const finalRect = tooltip.getBoundingClientRect();
    if (finalRect.left < 10) {
      tooltip.style.left = '10px';
    }
    if (finalRect.right > window.innerWidth - 10) {
      tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
    }
    if (finalRect.top < 10) {
      tooltip.style.top = '10px';
    }
  }

  /**
   * Go to next step
   */
  function nextStep() {
    if (currentStep < tutorialSteps.length - 1) {
      showStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  }

  /**
   * Go to previous step
   */
  function prevStep() {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  }

  /**
   * Skip the tutorial
   */
  function skipTutorial() {
    completeTutorial();
  }

  /**
   * Complete the tutorial
   */
  function completeTutorial() {
    // Remove highlight
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    // Hide overlay and tooltip
    if (overlay) overlay.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';

    // Mark as complete in backend
    fetch('/tester/tutorial/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      if (response.ok) {
        console.log('Tutorial completed');
      }
    }).catch(err => {
      console.error('Failed to mark tutorial complete:', err);
    });
  }

  // Expose public API
  window.TutorialTour = {
    init: initTutorial,
    next: nextStep,
    prev: prevStep,
    skip: skipTutorial,
    complete: completeTutorial
  };

  // Auto-start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTutorial);
  } else {
    initTutorial();
  }
})();
