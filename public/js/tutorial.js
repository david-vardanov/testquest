/**
 * TestQuest Tutorial Tour
 * Guided tour for first-time users
 */

(function () {
  "use strict";

  // Tutorial steps configuration
  const tutorialSteps = [
    {
      target: null, // No target - welcome modal
      title: "Bienvenido a TestQuest!",
      content:
        "Este tour rapido te mostrara como usar la plataforma de pruebas y ganar puntos. Comencemos!",
      position: "center",
    },
    {
      target: "#flows-section",
      title: "Flujos de Prueba",
      content:
        "Estos son tus flujos de prueba disponibles. Cada flujo contiene multiples casos de prueba que debes completar. Haz clic en un flujo para comenzar!",
      position: "bottom",
    },
    {
      target: ".flow-card-example",
      title: "Entendiendo las Tarjetas de Flujo",
      content:
        "Cada tarjeta muestra el nombre del flujo, numero de pruebas y puntos totales disponibles. Tu barra de progreso muestra cuantas pruebas has completado.",
      position: "bottom",
    },
    {
      target: "#rank-card",
      title: "Tu Posicion y Puntos",
      content:
        "Aqui puedes ver tu posicion actual en la clasificacion y puntos totales ganados. Completa mas pruebas y encuentra errores para subir!",
      position: "bottom",
    },
    {
      target: "#leaderboard-section",
      title: "Clasificacion y Recompensas",
      content:
        'Mira como te comparas con otros testers! La columna "Recompensa" muestra que premio recibira cada posicion al final de la temporada.',
      position: "left",
    },
    {
      target: "#practice-flow-card",
      title: "Comienza con Practica!",
      content:
        "Recomendamos comenzar con el Flujo de Practica para aprender como funcionan las pruebas. No afectara tus puntos - es solo para aprender!",
      position: "bottom",
    },
    {
      target: null,
      title: "Sistema de Puntos",
      content:
        "<strong>Como ganar puntos:</strong><br>Completar prueba: varia segun dificultad<br>Encontrar un error: +3 pts<br>Agregar comentarios: +1 pt<br>Subir captura de pantalla: +1 pt<br>Bonus por completar flujo: +3 pts (cuando todas las pruebas estan aprobadas)<br><br>Pruebas mas dificiles = mas puntos base. Maximiza en cada prueba!",
      position: "center",
    },
    {
      target: null,
      title: "Estas Listo!",
      content:
        "Eso es todo! Comienza con el Flujo de Practica para obtener experiencia practica, luego enfrenta los flujos de prueba reales. Buena suerte!",
      position: "center",
    },
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
    overlay = document.createElement("div");
    // overlay.className = 'tutorial-overlay';
    // overlay.id = 'tutorial-overlay';
    document.body.appendChild(overlay);

    // Create tooltip element
    tooltip = document.createElement("div");
    tooltip.className = "tutorial-tooltip";
    tooltip.id = "tutorial-tooltip";
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

    // Remove previous highlights and cascade animations
    document.querySelectorAll(".tutorial-highlight").forEach((el) => {
      el.classList.remove("tutorial-highlight");
      // Reset cascade delays and opacity on child cards
      el.querySelectorAll(".quest-card, .quest-item").forEach((card) => {
        card.style.removeProperty("--cascade-delay");
        card.style.animation = "none";
        card.style.opacity = "";
        card.style.transform = "";
        card.style.boxShadow = "";
        card.offsetHeight; // Force reflow
        card.style.animation = "";
      });
    });
    // Also reset any cards that were directly highlighted
    document
      .querySelectorAll(
        ".quest-card.tutorial-highlight, .quest-item.tutorial-highlight"
      )
      .forEach((card) => {
        card.style.opacity = "";
        card.style.transform = "";
        card.style.boxShadow = "";
      });

    // Find and highlight target element
    let targetEl = null;
    if (step.target) {
      targetEl = document.querySelector(step.target);
    }

    overlay.style.display = "block";

    // Build tooltip content
    const isLastStep = stepIndex === tutorialSteps.length - 1;
    const isFirstStep = stepIndex === 0;

    tooltip.innerHTML = `
      <div class="tutorial-tooltip-header">
        <span class="tutorial-tooltip-title">${step.title}</span>
        <span class="tutorial-tooltip-step">${stepIndex + 1}/${
      tutorialSteps.length
    }</span>
      </div>
      <div class="tutorial-tooltip-content">${step.content}</div>
      <div class="tutorial-tooltip-buttons">
        ${
          isLastStep
            ? '<button class="tutorial-btn tutorial-btn-skip" onclick="TutorialTour.restart()">Reiniciar</button>'
            : ""
        }
        <button class="tutorial-btn tutorial-btn-next" onclick="TutorialTour.${
          isLastStep ? "complete" : "next"
        }()">
          ${isLastStep ? "Comenzar!" : "Siguiente"}
        </button>
      </div>
      ${getArrowClass(step.position)}
    `;

    if (targetEl) {
      // Scroll element into view first, then highlight and position
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        targetEl.classList.add("tutorial-highlight");

        // If target IS a card itself (not a container), ensure it's fully visible
        if (
          targetEl.classList.contains("quest-card") ||
          targetEl.classList.contains("quest-item")
        ) {
          targetEl.style.opacity = "1";
          targetEl.style.animation = "none";
        }

        // Also highlight additional elements if specified
        if (step.alsoHighlight) {
          step.alsoHighlight.forEach((selector) => {
            const el = document.querySelector(selector);
            if (el) el.classList.add("tutorial-highlight");
          });
        }
        // Apply cascade animation delays to child cards (slower cascade)
        const cards = targetEl.querySelectorAll(".quest-card, .quest-item");
        cards.forEach((card, index) => {
          card.style.setProperty("--cascade-delay", index * 0.3 + "s");
        });
        // Make tooltip visible off-screen first to get dimensions
        tooltip.style.visibility = "hidden";
        tooltip.style.display = "block";
        positionTooltip(targetEl, step.position);
        tooltip.style.visibility = "visible";
      }, 350);
    } else {
      // Center modal - no scrolling needed
      tooltip.style.visibility = "hidden";
      tooltip.style.display = "block";
      positionTooltip(null, step.position);
      tooltip.style.visibility = "visible";
    }
  }

  /**
   * Get arrow HTML based on position
   */
  function getArrowClass(position) {
    switch (position) {
      case "top":
        return '<div class="tutorial-arrow tutorial-arrow-bottom"></div>';
      case "bottom":
        return '<div class="tutorial-arrow tutorial-arrow-top"></div>';
      case "left":
        return '<div class="tutorial-arrow tutorial-arrow-right"></div>';
      case "right":
        return '<div class="tutorial-arrow tutorial-arrow-left"></div>';
      default:
        return "";
    }
  }

  /**
   * Position the tooltip relative to target with dynamic arrow positioning
   */
  function positionTooltip(targetEl, position) {
    const isMobile = window.innerWidth < 768;
    const padding = 15;
    const margin = 10;

    // Reset styles
    tooltip.style.setProperty("--arrow-offset", "50%");
    tooltip.style.width = "";
    tooltip.style.transform = "none";
    tooltip.classList.remove("tutorial-tooltip-center");

    // Force reflow and get dimensions
    tooltip.offsetHeight;
    const tooltipRect = tooltip.getBoundingClientRect();

    // On mobile, CSS handles ALL positioning (fixed at bottom)
    if (isMobile) {
      tooltip.style.top = "";
      tooltip.style.left = "";
      tooltip.style.transform = "";
      tooltip.style.width = "";
      return;
    }

    if (!targetEl || position === "center") {
      tooltip.classList.add("tutorial-tooltip-center");
      tooltip.style.top = "50%";
      tooltip.style.left = "50%";
      tooltip.style.transform = "translate(-50%, -50%)";
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();

    // Get first visible child element for horizontal centering only
    let anchorRect = targetRect;
    const firstCard = targetEl.querySelector(
      ".quest-card, .quest-item, .card, table"
    );
    if (firstCard) {
      anchorRect = firstCard.getBoundingClientRect();
    }

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    let top,
      left,
      finalPosition = position;

    // Calculate available space using TARGET rect (not anchor) for vertical
    const spaceAbove = targetRect.top;
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceLeft = anchorRect.left;
    const spaceRight = window.innerWidth - anchorRect.right;

    // Auto-flip if not enough space
    if (position === "top" && spaceAbove < tooltipRect.height + padding) {
      finalPosition = "bottom";
    } else if (
      position === "bottom" &&
      spaceBelow < tooltipRect.height + padding
    ) {
      finalPosition = "top";
    } else if (position === "left" && spaceLeft < tooltipRect.width + padding) {
      finalPosition = "right";
    } else if (
      position === "right" &&
      spaceRight < tooltipRect.width + padding
    ) {
      finalPosition = "left";
    }

    // Calculate final position - use anchorRect for better positioning with large containers
    switch (finalPosition) {
      case "top":
        top = anchorRect.top - tooltipRect.height - padding + window.scrollY;
        left = anchorCenterX - tooltipRect.width / 2;
        break;
      case "bottom":
        // Use anchor (first card) bottom, not full container bottom
        top = anchorRect.bottom + padding + window.scrollY;
        left = anchorCenterX - tooltipRect.width / 2;
        break;
      case "left":
        // Align above top of target
        top = targetRect.top - tooltipRect.height / 2 + window.scrollY;
        left = targetRect.left - tooltipRect.width - padding;
        break;
      case "right":
        // Align above top of target
        top = targetRect.top - tooltipRect.height / 2 + window.scrollY;
        left = targetRect.right + padding;
        break;
    }

    // Clamp to viewport (use larger bottom margin for dock/taskbar)
    const bottomMargin = 100;
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - tooltipRect.width - margin)
    );
    top = Math.max(
      window.scrollY + margin,
      Math.min(
        top,
        window.scrollY + window.innerHeight - tooltipRect.height - bottomMargin
      )
    );

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";

    // Determine arrow direction based on tooltip position relative to anchor (first card)
    const tooltipTopViewport = top - window.scrollY;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;

    // If tooltip top is below anchor center, tooltip is "below" target - arrow points UP
    // If tooltip top is above anchor center, tooltip is "above" target - arrow points DOWN
    let arrowDirection = finalPosition;
    if (finalPosition === "top" || finalPosition === "bottom") {
      arrowDirection = tooltipTopViewport > anchorCenterY ? "bottom" : "top";
    }

    updateArrow(
      arrowDirection,
      position,
      anchorCenterX,
      anchorRect.top + anchorRect.height / 2,
      left,
      top,
      tooltipRect
    );
  }

  /**
   * Update arrow position and direction
   */
  function updateArrow(
    finalPosition,
    originalPosition,
    anchorX,
    anchorY,
    tooltipLeft,
    tooltipTop,
    tooltipRect
  ) {
    // Remove old arrow and add new one based on final position
    const oldArrow = tooltip.querySelector(".tutorial-arrow");
    if (oldArrow) oldArrow.remove();

    let arrowClass = "";
    switch (finalPosition) {
      case "top":
        arrowClass = "tutorial-arrow tutorial-arrow-bottom";
        break;
      case "bottom":
        arrowClass = "tutorial-arrow tutorial-arrow-top";
        break;
      case "left":
        arrowClass = "tutorial-arrow tutorial-arrow-right";
        break;
      case "right":
        arrowClass = "tutorial-arrow tutorial-arrow-left";
        break;
    }

    if (arrowClass) {
      const arrow = document.createElement("div");
      arrow.className = arrowClass;
      tooltip.appendChild(arrow);

      // Calculate arrow offset
      if (finalPosition === "top" || finalPosition === "bottom") {
        const offset = ((anchorX - tooltipLeft) / tooltipRect.width) * 100;
        tooltip.style.setProperty(
          "--arrow-offset",
          Math.max(15, Math.min(85, offset)) + "%"
        );
      } else {
        // Keep arrow centered for left/right positions
        tooltip.style.setProperty("--arrow-offset", "50%");
      }
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
    // Force remove all tutorial-related classes immediately
    document.querySelectorAll(".tutorial-highlight").forEach((el) => {
      el.classList.remove("tutorial-highlight");
    });
    completeTutorial();
  }

  /**
   * Complete the tutorial
   */
  function completeTutorial() {
    // Remove highlight from all elements
    document.querySelectorAll(".tutorial-highlight").forEach((el) => {
      el.classList.remove("tutorial-highlight");
    });

    // Remove overlay and tooltip from DOM completely
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }

    // Mark as complete in backend
    fetch("/tester/tutorial/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          console.log("Tutorial completed");
        }
      })
      .catch((err) => {
        console.error("Failed to mark tutorial complete:", err);
      });
  }

  /**
   * Restart the tutorial from beginning
   */
  function restartTutorial() {
    showStep(0);
  }

  // Expose public API
  window.TutorialTour = {
    init: initTutorial,
    next: nextStep,
    prev: prevStep,
    skip: skipTutorial,
    complete: completeTutorial,
    restart: restartTutorial,
  };

  // Auto-start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTutorial);
  } else {
    initTutorial();
  }
})();
