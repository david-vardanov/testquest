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
      title: 'Bienvenido a TestQuest!',
      content: 'Este tour rapido te mostrara como usar la plataforma de pruebas y ganar puntos. Comencemos!',
      position: 'center'
    },
    {
      target: '#flows-section',
      title: 'Flujos de Prueba',
      content: 'Estos son tus flujos de prueba disponibles. Cada flujo contiene multiples casos de prueba que debes completar. Haz clic en un flujo para comenzar!',
      position: 'right'
    },
    {
      target: '.flow-card-example',
      title: 'Entendiendo las Tarjetas de Flujo',
      content: 'Cada tarjeta muestra el nombre del flujo, numero de pruebas y puntos totales disponibles. Tu barra de progreso muestra cuantas pruebas has completado.',
      position: 'bottom'
    },
    {
      target: '#rank-card',
      title: 'Tu Posicion y Puntos',
      content: 'Aqui puedes ver tu posicion actual en la clasificacion y puntos totales ganados. Completa mas pruebas y encuentra errores para subir!',
      position: 'left'
    },
    {
      target: '#leaderboard-section',
      title: 'Clasificacion y Recompensas',
      content: 'Mira como te comparas con otros testers! La columna "Recompensa" muestra que premio recibira cada posicion al final de la temporada.',
      position: 'left'
    },
    {
      target: '#practice-flow-card',
      title: 'Comienza con Practica!',
      content: 'Recomendamos comenzar con el Flujo de Practica para aprender como funcionan las pruebas. No afectara tus puntos - es solo para aprender!',
      position: 'bottom'
    },
    {
      target: null,
      title: 'Sistema de Puntos',
      content: '<strong>Como ganar puntos:</strong><br>Completar prueba: varia segun dificultad<br>Encontrar un error: +3 pts<br>Agregar comentarios: +1 pt<br>Subir captura de pantalla: +1 pt<br>Bonus por completar flujo: +3 pts (cuando todas las pruebas estan aprobadas)<br><br>Pruebas mas dificiles = mas puntos base. Maximiza en cada prueba!',
      position: 'center'
    },
    {
      target: null,
      title: 'Estas Listo!',
      content: 'Eso es todo! Comienza con el Flujo de Practica para obtener experiencia practica, luego enfrenta los flujos de prueba reales. Buena suerte!',
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
          ${isLastStep ? '' : 'Saltar Tour'}
        </button>
        <button class="tutorial-btn tutorial-btn-next" onclick="TutorialTour.${isLastStep ? 'complete' : 'next'}()">
          ${isLastStep ? 'Comenzar!' : 'Siguiente'}
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
