(() => {
  "use strict";

  let socket;
  let uuid;
  let actionUuid;
  let settings = {};
  let language = "en";

  const planA = document.querySelector("#plan-a");
  const planB = document.querySelector("#plan-b");
  const status = document.querySelector("#status");
  const refresh = document.querySelector("#refresh");

  const text = {
    en: {
      intro: "Choose two existing Windows power plans. The key switches between them and never creates, edits, or deletes a plan.",
      a: "Plan A", b: "Plan B", refresh: "Refresh Windows plans",
      waiting: "Waiting for Stream Deck…", loading: "Reading Windows power plans…",
      ready: "Plans saved automatically.", permission: "Current user only · No administrator rights required",
      error: "Windows power plans could not be read."
    },
    es: {
      intro: "Elige dos planes de energía existentes. La tecla alterna entre ellos sin crear, editar ni eliminar planes.",
      a: "Plan A", b: "Plan B", refresh: "Actualizar planes de Windows",
      waiting: "Esperando a Stream Deck…", loading: "Leyendo planes de energía de Windows…",
      ready: "Los planes se guardan automáticamente.", permission: "Solo el usuario actual · No requiere permisos de administrador",
      error: "No se pudieron leer los planes de energía de Windows."
    }
  };

  function copy() { return text[language] || text.en; }
  function localize() {
    const value = copy();
    document.documentElement.lang = language;
    document.querySelector("#intro").textContent = value.intro;
    document.querySelector("#label-a").textContent = value.a;
    document.querySelector("#label-b").textContent = value.b;
    document.querySelector("#refresh").textContent = value.refresh;
    document.querySelector("#permission").textContent = value.permission;
  }

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function send(event, payload = {}) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event, context: uuid, action: actionUuid, payload }));
    }
  }

  function requestPlans() {
    setStatus(copy().loading);
    send("sendToPlugin", { command: "getPowerPlans" });
  }

  function save() {
    settings = { ...settings, planA: planA.value, planB: planB.value };
    send("setSettings", settings);
    send("sendToPlugin", { command: "settingsChanged" });
    setStatus(copy().ready, "ready");
  }

  function populate(payload) {
    const plans = Array.isArray(payload.plans) ? payload.plans : [];
    for (const select of [planA, planB]) {
      select.replaceChildren(...plans.map(({ guid, name }) => {
        const option = document.createElement("option");
        option.value = guid;
        option.textContent = name;
        return option;
      }));
      select.disabled = plans.length === 0;
    }

    const current = payload.activeGuid || plans[0]?.guid || "";
    planA.value = settings.planA || current;
    planB.value = settings.planB || plans.find((plan) => plan.guid !== planA.value)?.guid || current;
    if (!settings.planA || !settings.planB) save();
    setStatus(plans.length ? copy().ready : copy().error, plans.length ? "ready" : "error");
  }

  planA.addEventListener("change", save);
  planB.addEventListener("change", save);
  refresh.addEventListener("click", requestPlans);

  window.connectElgatoStreamDeckSocket = (port, propertyInspectorUuid, registerEvent, info, actionInfo) => {
    uuid = propertyInspectorUuid;
    const parsedInfo = JSON.parse(info);
    const parsedAction = JSON.parse(actionInfo);
    actionUuid = parsedAction.action;
    settings = parsedAction.payload?.settings || {};
    language = String(parsedInfo.application?.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
    localize();
    setStatus(copy().waiting);

    socket = new WebSocket(`ws://127.0.0.1:${port}`);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ event: registerEvent, uuid }));
      requestPlans();
    });
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.event === "sendToPropertyInspector" && message.payload?.type === "powerPlans") {
        populate(message.payload);
      }
    });
    socket.addEventListener("error", () => setStatus(copy().error, "error"));
  };
})();
