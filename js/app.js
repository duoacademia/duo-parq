(function () {
  "use strict";

  const questions = [
    { id: "q1", text: "Tem algum problema cardíaco de qualquer tipo?" },
    { id: "q2", text: "Sente dores no peito quando pratica exercícios?" },
    { id: "q3", text: "Recentemente sentiu dores no peito durante algum exercício físico?" },
    { id: "q4", text: "Apresenta desequilíbrio ou tontura levando ao desmaio?" },
    { id: "q5", text: "Tem algum problema ósseo, muscular ou articular que possa piorar com o exercício?" },
    { id: "q6", text: "Usa algum medicamento para pressão arterial ou coração?" },
    { id: "q7", text: "Sabe de alguma razão pela qual não deve praticar exercícios?" }
  ];

  const totalSteps = 10;
  const state = {
    step: 0,
    fullName: "",
    cpf: "",
    answers: {},
    signaturePad: null,
    signatureDate: null
  };

  const stepCard = document.querySelector("#stepCard");
  const progressLabel = document.querySelector("#progressLabel");
  const progressPercent = document.querySelector("#progressPercent");
  const progressBar = document.querySelector("#progressBar");
  const identityTemplate = document.querySelector("#identityTemplate");
  const questionTemplate = document.querySelector("#questionTemplate");
  const termTemplate = document.querySelector("#termTemplate");

  function todayText() {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date());
  }

  function timeText() {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
  }

  function updateProgress() {
    const percent = Math.round(((state.step + 1) / totalSteps) * 100);
    progressLabel.textContent = `Etapa ${state.step + 1} de ${totalSteps}`;
    progressPercent.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
  }

  function transitionTo(renderCallback) {
    stepCard.classList.add("is-leaving");
    window.setTimeout(function () {
      renderCallback();
      stepCard.classList.remove("is-leaving");
      stepCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }

  function onlyDigits(value) {
    return value.replace(/\D/g, "");
  }

  function maskCpf(value) {
    return onlyDigits(value)
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function isValidCpf(value) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let index = 0; index < 9; index += 1) {
      sum += Number(cpf[index]) * (10 - index);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== Number(cpf[9])) return false;

    sum = 0;
    for (let index = 0; index < 10; index += 1) {
      sum += Number(cpf[index]) * (11 - index);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    return digit === Number(cpf[10]);
  }

  function renderIdentity(type) {
    const node = identityTemplate.content.cloneNode(true);
    const number = node.querySelector(".step-number");
    const title = node.querySelector("h2");
    const grid = node.querySelector(".field-grid");
    const previous = node.querySelector("#prevButton");
    const next = node.querySelector("#nextButton");
    const field = document.createElement("label");
    const input = document.createElement("input");
    const label = document.createElement("span");

    number.textContent = `Etapa ${state.step + 1}`;
    previous.style.visibility = state.step === 0 ? "hidden" : "visible";
    title.textContent = type === "name" ? "Identificação do aluno" : "CPF do aluno";
    label.textContent = type === "name" ? "Nome completo" : "CPF";
    field.className = "field";

    input.id = type === "name" ? "fullName" : "cpf";
    input.value = type === "name" ? state.fullName : state.cpf;
    input.placeholder = type === "name" ? "Digite o nome completo" : "000.000.000-00";
    input.autocomplete = type === "name" ? "name" : "off";
    input.inputMode = type === "name" ? "text" : "numeric";
    input.maxLength = type === "name" ? 120 : 14;

    function validate() {
      if (type === "name") {
        state.fullName = input.value.trim().toUpperCase();
        input.value = input.value.toUpperCase();
        next.disabled = state.fullName.split(/\s+/).length < 2;
        return;
      }

      input.value = maskCpf(input.value);
      state.cpf = input.value;
      next.disabled = !isValidCpf(state.cpf);
    }

    input.addEventListener("input", validate);
    next.addEventListener("click", function () {
      state.step += 1;
      transitionTo(renderCurrentStep);
    });
    previous.addEventListener("click", function () {
      state.step -= 1;
      transitionTo(renderCurrentStep);
    });

    field.appendChild(label);
    field.appendChild(input);
    grid.appendChild(field);
    stepCard.innerHTML = "";
    stepCard.appendChild(node);
    validate();
    updateProgress();
  }

  function renderQuestion(index) {
    const question = questions[index];
    const node = questionTemplate.content.cloneNode(true);
    const number = node.querySelector(".step-number");
    const title = node.querySelector("h2");
    const statement = node.querySelector(".statement");
    const previous = node.querySelector("#prevButton");

    number.textContent = `Etapa ${state.step + 1}`;
    title.textContent = `Pergunta ${index + 1}`;
    statement.innerHTML = "";
    const text = document.createElement("p");
    text.textContent = question.text;
    statement.appendChild(text);

    node.querySelectorAll(".choice-button").forEach(function (button) {
      button.addEventListener("click", function () {
        state.answers[question.id] = button.dataset.answer;
        state.step += 1;
        transitionTo(renderCurrentStep);
      });
    });

    previous.addEventListener("click", function () {
      state.step -= 1;
      transitionTo(renderCurrentStep);
    });

    stepCard.innerHTML = "";
    stepCard.appendChild(node);
    updateProgress();
  }

  function validateTerm() {
    const confirm = document.querySelector("#termConfirm");
    const finish = document.querySelector("#finishButton");
    if (!confirm || !finish || !state.signaturePad) return;
    finish.disabled = !confirm.checked || !state.signaturePad.hasInk();
  }

  function showMessage(message) {
    const formMessage = document.querySelector("#formMessage");
    if (formMessage) formMessage.textContent = message;
  }

  function renderTerm() {
    const node = termTemplate.content.cloneNode(true);
    const number = node.querySelector(".step-number");

    number.textContent = `Etapa ${state.step + 1}`;
    stepCard.innerHTML = "";
    stepCard.appendChild(node);
    updateProgress();

    const canvas = document.querySelector("#signatureCanvas");
    const confirm = document.querySelector("#termConfirm");
    const finish = document.querySelector("#finishButton");
    const previous = document.querySelector("#prevButton");

    state.signaturePad = window.DuoSignature.createSignaturePad(canvas);
    if (!state.signatureDate) state.signatureDate = todayText();

    confirm.addEventListener("change", validateTerm);
    canvas.addEventListener("pointerup", validateTerm);
    canvas.addEventListener("pointerleave", validateTerm);

    document.querySelector("#clearSignature").addEventListener("click", function () {
      state.signaturePad.clear();
      validateTerm();
    });

    previous.addEventListener("click", function () {
      state.step -= 1;
      transitionTo(renderCurrentStep);
    });

    finish.addEventListener("click", handleSubmit);
    validateTerm();
  }

  function renderCompletion(result) {
    stepCard.innerHTML = "";
    progressLabel.textContent = "Registro final";
    progressPercent.textContent = "100%";
    progressBar.style.width = "100%";

    const panel = document.createElement("div");
    panel.className = "success-panel";

    const icon = document.createElement("div");
    icon.className = "success-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✓";

    const title = document.createElement("h2");
    title.textContent = result.uploaded ? "ENVIO CONFIRMADO!" : "PDF gerado!";

    const actions = document.createElement("div");
    actions.className = "actions final-actions";
    const restart = document.createElement("button");
    restart.className = "button primary";
    restart.type = "button";
    restart.textContent = "Nova confirmação";
    restart.addEventListener("click", resetFlow);

    actions.appendChild(restart);
    panel.appendChild(icon);
    panel.appendChild(title);
    stepCard.appendChild(panel);
    stepCard.appendChild(actions);
    stepCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetFlow() {
    state.step = 0;
    state.fullName = "";
    state.cpf = "";
    state.answers = {};
    state.signaturePad = null;
    state.signatureDate = null;
    renderCurrentStep();
  }

  async function handleSubmit() {
    const finish = document.querySelector("#finishButton");
    if (!finish || finish.disabled) return;

    if (!state.signaturePad || !state.signaturePad.hasInk()) {
      showMessage("A rúbrica ou assinatura é obrigatória.");
      return;
    }

    finish.disabled = true;
    finish.textContent = "GERANDO...";
    showMessage("");

    try {
      const result = await window.DuoParqDocuments.generateDocument({
        fullName: state.fullName,
        cpf: state.cpf,
        date: state.signatureDate,
        time: timeText(),
        questions,
        answers: state.answers,
        signatureImage: state.signaturePad.toDataURL()
      });
      renderCompletion(result);
    } catch (error) {
      finish.disabled = false;
      finish.textContent = "FINALIZAR";
      showMessage(error.message || "Não foi possível gerar o PDF. Tente novamente.");
    }
  }

  function renderCurrentStep() {
    if (state.step === 0) {
      renderIdentity("name");
      return;
    }

    if (state.step === 1) {
      renderIdentity("cpf");
      return;
    }

    if (state.step >= 2 && state.step <= 8) {
      renderQuestion(state.step - 2);
      return;
    }

    renderTerm();
  }

  renderCurrentStep();
})();
