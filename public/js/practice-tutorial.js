/**
 * TestQuest Practice Flow Interactive Tutorial
 * Forces users through all actions to learn the testing flow
 */

(function() {
  'use strict';

  // Practice Case 1: Teaching "Aprobado" (Passed)
  const practiceStep0Tutorial = [
    {
      target: null,
      title: 'Bienvenido a la Practica!',
      content: 'Te guiaremos paso a paso para que aprendas como completar una prueba. Sigue las instrucciones - no podras continuar hasta completar cada paso.',
      position: 'center'
    },
    {
      target: '.checklist-box:first-of-type',
      title: 'Pasos del Escenario',
      content: 'Primero, debes verificar cada paso del escenario. <strong>Marca cada casilla</strong> mientras lees y verificas cada paso.',
      position: 'bottom',
      waitFor: 'all-.step-check',
      actionText: 'Marca todas las casillas de pasos'
    },
    {
      target: '.checklist-box:last-of-type',
      title: 'Resultados Esperados',
      content: 'Ahora verifica cada resultado esperado. <strong>Marca cada casilla</strong> cuando confirmes que el resultado es correcto.',
      position: 'bottom',
      waitFor: 'all-.expected-check',
      actionText: 'Marca todas las casillas de resultados'
    },
    {
      target: '#status-passed',
      title: 'Selecciona "Aprobado"',
      content: 'Completaste todos los pasos y verificaste los resultados. Ahora puedes seleccionar <strong>"Aprobado"</strong> porque todo funciono correctamente.',
      position: 'top',
      waitFor: 'click-#status-passed',
      disable: ['#status-failed'],
      actionText: 'Haz clic en "Aprobado"'
    },
    {
      target: 'button[type="submit"]',
      title: 'Enviar y Continuar',
      content: 'Excelente! Haz clic en el boton para enviar esta prueba y continuar a la siguiente leccion.',
      position: 'top',
      allowSubmit: true
    }
  ];

  // Practice Case 2: Teaching "Fallido" (Failed) + Feedback
  const practiceStep1Tutorial = [
    {
      target: null,
      title: 'Reportando Errores',
      content: 'Ahora aprenderemos a reportar errores. Cuando encuentras un problema en la aplicacion, seleccionas "Fallido" y describes el error.',
      position: 'center'
    },
    {
      target: '#status-failed',
      title: 'Selecciona "Fallido"',
      content: 'Imagina que encontraste un error. Selecciona <strong>"Fallido"</strong> para indicar que la prueba no paso. Esto te otorga <strong>+3 puntos extra</strong> por encontrar errores!',
      position: 'top',
      waitFor: 'click-#status-failed',
      disable: ['#status-passed'],
      actionText: 'Haz clic en "Fallido"'
    },
    {
      target: 'textarea[name="feedback"]',
      title: 'Describe el Error',
      content: 'Escribe una descripcion del error que "encontraste". En pruebas reales, describe claramente que paso mal y como reproducir el problema. <strong>Escribe al menos 10 caracteres.</strong>',
      position: 'top',
      waitFor: 'input-textarea[name="feedback"]',
      minLength: 10,
      actionText: 'Escribe una descripcion (minimo 10 caracteres)'
    },
    {
      target: 'button[type="submit"]',
      title: 'Enviar Reporte',
      content: 'Perfecto! Ahora haz clic para enviar tu reporte de error y continuar a la ultima leccion.',
      position: 'top',
      allowSubmit: true
    }
  ];

  // Practice Case 3: Teaching Screenshot + Feedback
  const practiceStep2Tutorial = [
    {
      target: null,
      title: 'Evidencia Visual',
      content: 'Finalmente, aprenderemos a subir capturas de pantalla como evidencia. Las capturas ayudan a los desarrolladores a ver exactamente lo que observaste.',
      position: 'center'
    },
    {
      target: 'input[name="screenshot"]',
      title: 'Sube una Captura',
      content: 'Selecciona cualquier imagen de tu computadora para practicar. En pruebas reales, tomarias una captura de pantalla de lo que observaste. <strong>Esto te da +1 punto extra!</strong>',
      position: 'top',
      waitFor: 'file-input[name="screenshot"]',
      actionText: 'Selecciona una imagen'
    },
    {
      target: 'textarea[name="feedback"]',
      title: 'Agrega Comentarios',
      content: 'Describe lo que muestra tu captura de pantalla. Los comentarios claros ayudan al equipo a entender el contexto. <strong>Escribe al menos 5 caracteres.</strong>',
      position: 'top',
      waitFor: 'input-textarea[name="feedback"]',
      minLength: 5,
      actionText: 'Escribe un comentario (minimo 5 caracteres)'
    },
    {
      target: 'button[type="submit"]',
      title: 'Completar Practica!',
      content: 'Felicidades! Has aprendido todos los elementos de TestQuest. Haz clic para completar la practica y comenzar con las pruebas reales.',
      position: 'top',
      allowSubmit: true
    }
  ];

  // Select tutorial based on practice step
  const tutorialConfigs = [practiceStep0Tutorial, practiceStep1Tutorial, practiceStep2Tutorial];

  class PracticeTutorial {
    constructor(steps) {
      this.steps = steps;
      this.currentIndex = 0;
      this.overlay = null;
      this.tooltip = null;
      this.isComplete = false;
      this.disabledElements = [];
      this.eventListeners = [];
    }

    init() {
      this.createOverlay();
      this.createTooltip();
      this.blockFormSubmit();
      this.showStep(0);
    }

    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'tutorial-overlay blocking';
      this.overlay.id = 'practice-tutorial-overlay';
      document.body.appendChild(this.overlay);
    }

    createTooltip() {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tutorial-tooltip';
      this.tooltip.id = 'practice-tutorial-tooltip';
      document.body.appendChild(this.tooltip);
    }

    blockFormSubmit() {
      const form = document.getElementById('practice-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          if (!this.isComplete) {
            e.preventDefault();
            this.shakeTooltip();
          }
        });
      }
    }

    shakeTooltip() {
      this.tooltip.classList.add('tutorial-shake');
      setTimeout(() => this.tooltip.classList.remove('tutorial-shake'), 500);
    }

    showStep(index) {
      this.currentIndex = index;
      const step = this.steps[index];

      // Clear previous event listeners
      this.clearEventListeners();

      // Remove previous highlights
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });

      // Re-enable previously disabled elements
      this.disabledElements.forEach(el => {
        el.disabled = false;
      });
      this.disabledElements = [];

      // Disable elements if specified
      if (step.disable) {
        step.disable.forEach(sel => {
          const el = document.querySelector(sel);
          if (el) {
            el.disabled = true;
            this.disabledElements.push(el);
          }
        });
      }

      // Build tooltip content
      const isLastStep = index === this.steps.length - 1;
      const hasWaitCondition = !!step.waitFor;

      this.tooltip.innerHTML = `
        <div class="tutorial-tooltip-header">
          <span class="tutorial-tooltip-title">${step.title}</span>
          <span class="tutorial-tooltip-step">${index + 1}/${this.steps.length}</span>
        </div>
        <div class="tutorial-tooltip-content">${step.content}</div>
        ${step.actionText ? `<div class="tutorial-action-required">→ ${step.actionText}</div>` : ''}
        <div class="tutorial-tooltip-buttons">
          <button class="tutorial-btn tutorial-btn-skip" onclick="PracticeTutorialInstance.skip()">
            Salir de Practica
          </button>
          <button class="tutorial-btn tutorial-btn-next ${hasWaitCondition ? 'disabled' : ''}"
                  id="tutorial-next-btn"
                  onclick="PracticeTutorialInstance.${isLastStep ? 'complete' : 'next'}()">
            ${isLastStep ? 'Finalizar!' : 'Siguiente'}
          </button>
        </div>
        ${this.getArrowHTML(step.position)}
      `;

      // Find and handle target element
      const target = step.target ? document.querySelector(step.target) : null;

      if (target) {
        // Scroll into view first
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          target.classList.add('tutorial-highlight');
          this.positionTooltip(target, step.position);
          this.tooltip.style.display = 'block';
        }, 350);
      } else {
        this.positionTooltip(null, 'center');
        this.tooltip.style.display = 'block';
      }

      // Set up wait condition if specified
      if (step.waitFor) {
        this.setupWaitCondition(step.waitFor, step.minLength);
      }

      // If this is the last step with allowSubmit, mark as complete
      if (step.allowSubmit) {
        this.isComplete = true;
      }
    }

    setupWaitCondition(waitFor, minLength) {
      const dashIndex = waitFor.indexOf('-');
      const type = waitFor.substring(0, dashIndex);
      const selector = waitFor.substring(dashIndex + 1);

      if (type === 'all') {
        // Wait for all checkboxes to be checked
        const elements = document.querySelectorAll(selector);
        const check = () => {
          const allChecked = Array.from(elements).every(el => el.checked);
          if (allChecked) {
            this.enableNextButton();
          } else {
            this.disableNextButton();
          }
        };
        elements.forEach(el => {
          const handler = () => check();
          el.addEventListener('change', handler);
          this.eventListeners.push({ el, event: 'change', handler });
        });
      }
      else if (type === 'click') {
        // Wait for click/change on element (radio button)
        const el = document.querySelector(selector);
        if (el) {
          const handler = () => {
            if (el.checked) {
              this.enableNextButton();
            }
          };
          el.addEventListener('change', handler);
          this.eventListeners.push({ el, event: 'change', handler });
        }
      }
      else if (type === 'input') {
        // Wait for text input with minimum length
        const el = document.querySelector(selector);
        if (el) {
          const handler = () => {
            if (el.value.trim().length >= (minLength || 1)) {
              this.enableNextButton();
            } else {
              this.disableNextButton();
            }
          };
          el.addEventListener('input', handler);
          this.eventListeners.push({ el, event: 'input', handler });
        }
      }
      else if (type === 'file') {
        // Wait for file selection
        const el = document.querySelector(selector);
        if (el) {
          const handler = () => {
            if (el.files && el.files.length > 0) {
              this.enableNextButton();
            } else {
              this.disableNextButton();
            }
          };
          el.addEventListener('change', handler);
          this.eventListeners.push({ el, event: 'change', handler });
        }
      }
    }

    clearEventListeners() {
      this.eventListeners.forEach(({ el, event, handler }) => {
        el.removeEventListener(event, handler);
      });
      this.eventListeners = [];
    }

    enableNextButton() {
      const btn = document.getElementById('tutorial-next-btn');
      if (btn) {
        btn.classList.remove('disabled');
      }
    }

    disableNextButton() {
      const btn = document.getElementById('tutorial-next-btn');
      if (btn) {
        btn.classList.add('disabled');
      }
    }

    getArrowHTML(position) {
      switch(position) {
        case 'top': return '<div class="tutorial-arrow tutorial-arrow-bottom"></div>';
        case 'bottom': return '<div class="tutorial-arrow tutorial-arrow-top"></div>';
        case 'left': return '<div class="tutorial-arrow tutorial-arrow-right"></div>';
        case 'right': return '<div class="tutorial-arrow tutorial-arrow-left"></div>';
        default: return '';
      }
    }

    positionTooltip(targetEl, position) {
      const tooltipRect = this.tooltip.getBoundingClientRect();
      const padding = 20;

      if (!targetEl || position === 'center') {
        this.tooltip.style.top = '50%';
        this.tooltip.style.left = '50%';
        this.tooltip.style.transform = 'translate(-50%, -50%)';
        return;
      }

      this.tooltip.style.transform = 'none';
      const targetRect = targetEl.getBoundingClientRect();

      switch(position) {
        case 'top':
          this.tooltip.style.top = (targetRect.top - tooltipRect.height - padding + window.scrollY) + 'px';
          this.tooltip.style.left = (targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)) + 'px';
          break;
        case 'bottom':
          this.tooltip.style.top = (targetRect.bottom + padding + window.scrollY) + 'px';
          this.tooltip.style.left = (targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)) + 'px';
          break;
        case 'left':
          this.tooltip.style.top = (targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2) + window.scrollY) + 'px';
          this.tooltip.style.left = (targetRect.left - tooltipRect.width - padding) + 'px';
          break;
        case 'right':
          this.tooltip.style.top = (targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2) + window.scrollY) + 'px';
          this.tooltip.style.left = (targetRect.right + padding) + 'px';
          break;
      }

      // Keep tooltip in viewport
      const finalRect = this.tooltip.getBoundingClientRect();
      if (finalRect.left < 10) {
        this.tooltip.style.left = '10px';
      }
      if (finalRect.right > window.innerWidth - 10) {
        this.tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
      }
      if (finalRect.top < 10) {
        this.tooltip.style.top = (10 + window.scrollY) + 'px';
      }
      if (finalRect.bottom > window.innerHeight - 10) {
        this.tooltip.style.top = (window.innerHeight - tooltipRect.height - 10 + window.scrollY) + 'px';
      }
    }

    next() {
      const btn = document.getElementById('tutorial-next-btn');
      if (btn && btn.classList.contains('disabled')) {
        this.shakeTooltip();
        return;
      }

      if (this.currentIndex < this.steps.length - 1) {
        this.showStep(this.currentIndex + 1);
      } else {
        this.complete();
      }
    }

    skip() {
      // Redirect back to dashboard
      window.location.href = '/tester';
    }

    complete() {
      // Clean up
      this.clearEventListeners();
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
      this.disabledElements.forEach(el => {
        el.disabled = false;
      });

      if (this.overlay) this.overlay.remove();
      if (this.tooltip) this.tooltip.remove();

      this.isComplete = true;

      // Auto-submit the form
      const form = document.getElementById('practice-form');
      if (form) {
        form.submit();
      }
    }
  }

  // Initialize when DOM is ready
  function initPracticeTutorial() {
    const practiceStep = window.practiceStep;
    if (typeof practiceStep !== 'number' || practiceStep < 0 || practiceStep >= tutorialConfigs.length) {
      return;
    }

    const tutorial = new PracticeTutorial(tutorialConfigs[practiceStep]);
    window.PracticeTutorialInstance = tutorial;
    tutorial.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPracticeTutorial);
  } else {
    initPracticeTutorial();
  }
})();
