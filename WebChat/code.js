const EmbedContext = {};
EmbedContext.flow = null;
EmbedContext.messageList = [];
EmbedContext.webClientId = 0;

const apiUrl = "http://localhost:5015";
const wssUrl = "http://localhost:5056/chat-hub";
const connection = new signalR.HubConnectionBuilder()
  .withUrl(wssUrl)
  .build();

const messagesList = document.querySelector(".messages-list");
const chatTogglerBtn = document.querySelector(".chat-toggle-btn");
const sendBtn = document.getElementById("send-btn");
const chatInputText = document.getElementById("text");

chatTogglerBtn.addEventListener("click", async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    EmbedContext.webClientId = parseInt(params.get("clientId"));
    await fetchActiveFlow();

    document.body.classList.toggle("show-chat");
    chatTogglerBtn.innerText === "mode_comment" ? chatTogglerBtn.innerHTML = "close" : chatTogglerBtn.innerHTML = "mode_comment"

  } catch (error) {
    console.log(error)
  }

});

connection.on("ChatStarted", (chatConnectionId) => {
  EmbedContext.chatId = chatConnectionId;
});

connection.on("ReceiveMessage", (messageDto) => {
  createMessageElementAndAppend(messageDto);
});

connection.on("OperatorJoined", (message) => {
  removeLoadingIndicator();
  // const messageEl = document.createElement("li");
  // const chatContent = `<p>Se ha asignado un operador! 🧑‍💻</p>`;
  // messageEl.classList.add("message");
  // messageEl.innerHTML = chatContent;
  // messageEl.classList.add("incoming");
  // messagesList.appendChild(messageEl);

  const messageDto = {
    senderType: 2,
    content: `<p>Se ha asignado un operador! 🧑‍💻</p>`
  }

  createMessageElementAndAppend(messageDto)
});

const fetchActiveFlow = async () => {
  try {
    const response = await fetch(`${apiUrl}/Flow/active/embebido`);
    if (response.ok) {
      const flow = await response.json();
      EmbedContext.flow = flow;
    } else if (response.status == 404) {

    } else {
      throw new Error("No se pudo obtener el flujo activo.");
    }

  } catch (error) {
    console.error("Error al obtener el flujo activo:", error.message);
  }
}

const sendIdentityData = async (customerData) => {
  const rawResponse = await fetch(`${apiUrl}/customer/identify`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(customerData)
  });
  const content = await rawResponse.json();

  let noError = true;
  if (rawResponse.ok) {
    // saveChat({ source: 1, messages: [], customerId: content.id });
    EmbedContext.customerId = content.id;
    createMessageElementAndAppend({ senderType: 2, content: `<p>🤖 Genial ${content.name}! qué buscás?</p>` });

  } else {
    noError = false;
    createMessageElementAndAppend({ senderType: 2, content: '<p>Ha ocurrido un error, por favor inténtalo nuevamente más tarde</p>' });
  }

  if (noError) {
    if (EmbedContext.flow != null) {
      fetchNextNode(EmbedContext.flow.id);
    } else {
      saveChat({ source: 1, messages: [], customerId: EmbedContext.customerId });
    }
  }

};

const saveChat = async (chatDto) => {

  chatDto.clientId = EmbedContext.webClientId;

  const rawResponse = await fetch(`${apiUrl}/chat`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chatDto)
  });
  const newChat = await rawResponse.json();

  console.log("Chat creado: ", { newChat });

  if (rawResponse.ok) {
    EmbedContext.chatId = newChat.id;
    console.log("4 - Quiero hablar con el operador...");
    await connection.invoke("RequestHelp", newChat);
  } else {
    //TODO: Agarrar el error
  }
};

const startConnection = async () => {
  try {
    await connection.start();
    console.log("3 - Conectado al Hub de SignalR");
    // console.log("4 - Quiero hablar con el operador...");
    // await connection.invoke("RequestHelp");
  } catch (err) {
    console.error("Error al conectar con el Hub de SignalR", err);
    //  setTimeout(startConnection, 5000); // Reintento en caso de fallo
  }
}

const newUserMessage = async () => {
  try {
    let userMessage = chatInputText.value.trim();

    if (EmbedContext.messageList.length === 0) {
      const name = document.getElementById('customer-name').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();

      if (validatePhoneNumber(phone)) {
        sendIdentityData({ name, phone });
        chatInputText.removeAttribute('disabled');
        EmbedContext.messageList.push(`Nombre: ${name} | Celular: ${phone}`);
      } else {
        createMessageElementAndAppend({
          senderType: 2,
          content: `<p>❌ El formato del número no es correcto, por favor intenta nuevamente</p>`
        });
      }

    } else {
      //El 1 acá es el senderType USUARIO_FINAL
      await connection.invoke("SendMessageToChat", EmbedContext.chatId, 1, userMessage);
      EmbedContext.messageList.push(userMessage);
    }

    chatInputText.value = "";
  } catch (err) {
    console.error("Error al enviar mensaje:", err);
  }
}

const fetchNextNode = async (flowId, currentNodeId = null, condition = null) => {
  try {
    const query = new URLSearchParams({ currentNodeId, condition }).toString();
    const response = await fetch(`${apiUrl}/Flow/${flowId}/nextNode?${query}`);
    if (response.ok) {
      const nextNodes = await response.json();
      console.log({ nextNodes });
      nextNodes.forEach(node => processNode(node));
    } else {
      if (response.status == 404) {
        console.log('Era último nodo')
      } else {
        throw new Error("No se pudo obtener el nodo siguiente.");
      }
    }
  } catch (err) {
    console.error(err.message);
  }
}

const processNode = async (node) => {
  console.log('Procesando nodo', { node });
  if (node.type === "textNode") {
    const message = document.createElement("li");
    const chatContent = `<p>🤖 ${node.data.label}</p>`;
    message.classList.add("message");
    message.innerHTML = chatContent;
    message.classList.add("incoming");
    messagesList.appendChild(message);

    messagesList.scrollTo(0, messagesList.scrollHeight);

    fetchNextNode(EmbedContext.flow.id, node.id);
  } else if (node.type === "buttonNode") {

    const button = document.createElement('button');
    button.classList.add("option-button");
    button.textContent = node.data.label;
    button.onclick = () => fetchNextNode(EmbedContext.flow.id, node.id);
    messagesList.appendChild(button);

  } else if (node.type === "actionNode") {
    displayLoadingIndicator();

    if (node.data.label == "Llamar Operador") {
      await startConnection();
      saveChat({ source: 1, messages: [], customerId: EmbedContext.customerId });
    }

    fetchNextNode(EmbedContext.flow.id, node.id);
  }
}

const displayLoadingIndicator = () => {
  const loader = document.createElement("div");
  loader.classList.add("stage");
  loader.innerHTML = `<div class="dot-falling"></div>`;
  messagesList.appendChild(loader);
  console.log('Esperando nodo...');
}

const removeLoadingIndicator = () => {
  setTimeout(() => {
    const loader = document.querySelector('.stage');
    loader?.remove();
    console.log('HAY respuesta del backend');
  }, 1000)
}

const createMessageElementAndAppend = (messageDto) => {

  const messageEl = document.createElement("li");
  console.log({ messageDto });
  const senderIsClient = messageDto.senderType == 1 ? true : false;
  messageEl.classList.add("message");
  const chatContent = `<p>${messageDto.content}</p>`;
  messageEl.innerHTML = chatContent;
  messageEl.classList.add(senderIsClient ? "outgoing" : "incoming");


  messagesList.appendChild(messageEl);
  messagesList.scrollTo(0, messagesList.scrollHeight);
}

const validatePhoneNumber = (phone) => {
  // Expresión regular que:
  // ^  : Inicio de la cadena
  // \+?: Permite '+' opcional al inicio
  // [0-9]+ : Uno o más dígitos
  // $  : Fin de la cadena
  const regex = /^\+?[0-9]+$/;
  return regex.test(phone);
}

sendBtn.addEventListener("click", newUserMessage);
chatInputText.addEventListener('keydown', function (e) { e.key == 'Enter' && newUserMessage });
chatInputText.setAttribute('disabled', true);

