import './style.css';

const EmbedContext = {};
EmbedContext.flow = null;
EmbedContext.messageList = [];
EmbedContext.webClientId = 0;
EmbedContext.isExistingUser = false;
EmbedContext.pendingChat = null;

const SenderTypes = {
  'CUSTOMER': 1,
  'OPERATOR': 2,
  'SYSTEM': 3,
}

const ChatSource = {
  'WEB_WIDGET': 1
}

const ChatStatuses = {
  'NEW': 1,
  'TAKEN': 2,
  'IN_PROGRESS': 3,
  'ENDED': 4,
}

const apiUrl = process.env.API_URL;
const wssUrl = process.env.SIGNALR_URL;
const connection = new signalR.HubConnectionBuilder()
  .withUrl(wssUrl)
  .build();

const messagesList = document.querySelector(".messages-list");
const chatTogglerBtn = document.querySelector(".chat-toggle-btn");
const sendBtn = document.getElementById("send-btn");
const chatInputText = document.getElementById("text");

chatTogglerBtn.addEventListener("click", async () => {
  try {

    if (!EmbedContext.flow) {
      const params = new URLSearchParams(window.location.search);
      EmbedContext.webClientId = parseInt(params.get("clientId"));
      await fetchActiveFlow();
    }

    document.body.classList.toggle("show-chat");
    chatTogglerBtn.innerText === "mode_comment" ? chatTogglerBtn.innerHTML = "close" : chatTogglerBtn.innerHTML = "mode_comment"

  } catch (error) {
    console.warn(error)
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
  const messageDto = {
    senderType: SenderTypes.SYSTEM,
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
    createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: '<p>Ha ocurrido un error, por favor inténtalo nuevamente más tarde</p>' });
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
    EmbedContext.customerId = content.customer.id;
    EmbedContext.isExistingUser = content.isExistingUser;

    if (!EmbedContext.isExistingUser && EmbedContext.flow != null) {
      createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: `<p>🤖 Genial ${content.customer.name}! qué buscás?</p>` });
    }

  } else {
    noError = false;
    createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: '<p>Ha ocurrido un error, por favor inténtalo nuevamente más tarde</p>' });
  }

  //Si es un usuario existente me fijo si tiene chats pendientes antes que nada
  let pendingChat = false;
  if (EmbedContext.isExistingUser) {
    pendingChat = await getPendingChat(EmbedContext.customerId, EmbedContext.webClientId);
    EmbedContext.pendingChat = pendingChat;
  }

  //Si hay efectivamente un chat pendiente, pregunto si lo quiere retomar
  if (EmbedContext.pendingChat) {
    //Ya conecto al HUB porque cualquiera de las
    await startConnection();
    createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: '<p>🤖 Vemos que tienes un chat sin terminar con nosotros, te gustaría continuarlo?</p>' });

    createYesNoButtons(
      async () => {
        createMessageElementAndAppend({
          senderType: SenderTypes.SYSTEM,
          content: `<p>🤖 Perfecto! Enseguida te comunicamos con un operador, abajo incluimos el historial de la última conversación que tuviste ⬇️ </p>`
        });
        renderPreviousChatMessages(EmbedContext.pendingChat);
        EmbedContext.chatId = EmbedContext.pendingChat.id;
        displayLoadingIndicator();
        await connection.invoke("RequestHelp", EmbedContext.pendingChat);
      },
      async () => {
        await updateChat(EmbedContext.pendingChat.id, ChatStatuses.ENDED)
        EmbedContext.pendingChat = false;
        if (!EmbedContext.pendingChat && noError) {
          if (EmbedContext.flow != null) {
            fetchNextNode(EmbedContext.flow.id);
          } else {
            if (connection.state === signalR.HubConnectionState.Disconnected) {
              await startConnection();
            }
            displayLoadingIndicator();
            //Creo un chat nuevo
            saveChat({ source: ChatSource.WEB_WIDGET, messages: [], customerId: EmbedContext.customerId });
          }
        }
      });

  } else {

    if (noError) {
      if (EmbedContext.flow != null) {
        fetchNextNode(EmbedContext.flow.id);
      } else {
        if (connection.state === signalR.HubConnectionState.Disconnected) {
          await startConnection();
        }
        displayLoadingIndicator();
        //Creo un chat nuevo
        saveChat({ source: ChatSource.WEB_WIDGET, messages: [], customerId: EmbedContext.customerId });
      }
    }

  }

};

const getPendingChat = async (customerId, clientId) => {
  let chat = false;
  try {
    const response = await fetch(`${apiUrl}/chat/pending?customerId=${customerId}&clientId=${clientId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("No se encontró un chat pendiente para los IDs proporcionados.");
      }
      throw new Error(`Error en la solicitud: ${response.statusText}`);
    }

    chat = await response.json();
  } catch (error) {
    console.error("Error al obtener el chat pendiente:", error.message);
  }
  finally {
    return chat;
  }
}

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

  if (rawResponse.ok) {
    EmbedContext.chatId = newChat.id;
    await connection.invoke("RequestHelp", newChat);
  } else {
    createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: '<p>Ha ocurrido un error, por favor inténtalo nuevamente más tarde</p>' });
  }
};

export const updateChat = async (chatId, statusId) => {
  const chatUpdateDto = {
    chatId: chatId,
    customerId: EmbedContext.customerId,
    status: statusId,
    messages: [],
  };
  const response = await fetch(`${apiUrl}/chat/${chatId}`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify(chatUpdateDto),
  });

  await response.json();
  if (!response.ok) {
    createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: '<p>Ha ocurrido un error, por favor inténtalo nuevamente más tarde</p>' });
  }

};

const startConnection = async () => {
  try {
    await connection.start();
  } catch (err) {
    console.error("Error al conectar con el Hub de SignalR", err);
    createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: '<p>Ha ocurrido un error, por favor inténtalo nuevamente más tarde</p>' });
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
          senderType: SenderTypes.SYSTEM,
          content: `<p>❌ El formato del número no es correcto, por favor intenta nuevamente</p>`
        });
      }

    } else {
      if (userMessage.length == 0) {
        return false;
      }
      //El 1 acá es el senderType USUARIO_FINAL
      await connection.invoke("SendMessageToChat", EmbedContext.chatId, 1, userMessage);
      EmbedContext.messageList.push(userMessage);
    }

    chatInputText.value = "";
  } catch (err) {
    console.error("Error al enviar mensaje:", err);
    createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: '<p>Ha ocurrido un error, por favor inténtalo nuevamente más tarde</p>' });
  }
}

const fetchNextNode = async (flowId, currentNodeId = null, condition = null) => {
  try {
    const query = new URLSearchParams({ currentNodeId, condition }).toString();
    const response = await fetch(`${apiUrl}/Flow/${flowId}/nextNode?${query}`);
    if (response.ok) {
      const nextNodes = await response.json();
      nextNodes.forEach(node => processNode(node));
    } else {
      if (!response.status == 404) {
        throw new Error("No se pudo obtener el nodo siguiente.");
      }
    }
  } catch (err) {
    console.error(err.message);
    createMessageElementAndAppend({ senderType: SenderTypes.SYSTEM, content: '<p>Ha ocurrido un error, por favor inténtalo nuevamente más tarde</p>' });
  }
}

const processNode = async (node) => {
  if (node.type === "textNode") {
    const message = document.createElement("li");
    const chatContent = `<p>🤖 ${node.data.label}</p>`;
    message.classList.add("message");
    message.innerHTML = chatContent;
    message.classList.add("system");
    messagesList.appendChild(message);

    messagesList.scrollTo(0, messagesList.scrollHeight);

    fetchNextNode(EmbedContext.flow.id, node.id);
  } else if (node.type === "buttonNode") {

    const button = document.createElement('button');
    button.classList.add("option-button");
    button.textContent = node.data.label;
    //Solo dejo clickear una vez
    button.addEventListener("click", () => {
      fetchNextNode(EmbedContext.flow.id, node.id);

    }, { once: true });
    messagesList.appendChild(button);

  } else if (node.type === "actionNode") {
    displayLoadingIndicator();

    if (node.data.label == "Llamar Operador") {
      if (connection.state === signalR.HubConnectionState.Disconnected) {
        await startConnection();
      }
      saveChat({ source: ChatSource.WEB_WIDGET, messages: [], customerId: EmbedContext.customerId });
    }

    fetchNextNode(EmbedContext.flow.id, node.id);
  }
}

const displayLoadingIndicator = () => {

  createMessageElementAndAppend({
    senderType: SenderTypes.SYSTEM,
    content: `<p> 🧑‍💻 Esperando por un operador...</p>`
  });

  const loader = document.createElement("div");
  loader.classList.add("stage");
  loader.innerHTML = `<div class="dot-falling"></div>`;
  messagesList.appendChild(loader);
}

const removeLoadingIndicator = () => {
  setTimeout(() => {
    const loader = document.querySelector('.stage');
    loader?.remove();
  }, 1000)
}

const createMessageElementAndAppend = (messageDto) => {

  const messageEl = document.createElement("li");
  messageEl.classList.add("message");

  switch (messageDto.senderType) {
    case SenderTypes.CUSTOMER:
      messageEl.classList.add("outgoing");
      break;
    case SenderTypes.OPERATOR:
      messageEl.classList.add("incoming");
      break;
    default:
      messageEl.classList.add("system");
      break;
  }

  const chatContent = `<p>${messageDto.content}</p>`;
  messageEl.innerHTML = chatContent;

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

const createYesNoButtons = (yesAfterFunction, noAfterFunction) => {
  //BOTON SI
  const yesButton = document.createElement('button');
  yesButton.classList.add("option-button");
  yesButton.textContent = "Si";
  //Solo dejo clickear una vez
  yesButton.addEventListener("click", () => {
    yesAfterFunction();
  }, { once: true });
  messagesList.appendChild(yesButton);


  //BOTON NO
  const noButton = document.createElement('button');
  noButton.classList.add("option-button");
  noButton.textContent = "No";
  //Solo dejo clickear una vez
  noButton.addEventListener("click", () => {
    noAfterFunction();
  }, { once: true });
  messagesList.appendChild(noButton);
}

const renderPreviousChatMessages = (chat) => {
  chat.messages.forEach((message) => {
    createMessageElementAndAppend({
      senderType: message.senderType,
      content: `<p> 🕔 ${message.content}</p > `
    });
  })
}


sendBtn.addEventListener("click", newUserMessage);
chatInputText.addEventListener('keydown', function (e) {
  if (e.key == 'Enter') {
    newUserMessage()
  }
});
chatInputText.setAttribute('disabled', true);

