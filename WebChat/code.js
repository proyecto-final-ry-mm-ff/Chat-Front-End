const EmbedContext = {};
EmbedContext.customerId = 0;
EmbedContext.messageList = [];

const apiUrl = "http://localhost:5015";
const wssUrl = "http://localhost:5056/chat-hub";
const connection = new signalR.HubConnectionBuilder()
  .withUrl(wssUrl)
  .build();

const messagesList = document.querySelector(".messages-list");
const chatTogglerBtn = document.querySelector(".chat-toggle-btn");
const sendBtn = document.getElementById("send-btn");
const chatInputText = document.getElementById("text");

const flowId = 6; // ID del flujo que quieres iniciar


connection.on("ChatStarted", (chatConnectionId) => {
  EmbedContext.chatId = chatConnectionId;
});

connection.on("ReceiveMessage", (messageDto) => {
  const message = document.createElement("li");
  console.log({ messageDto });
  const senderIsClient = messageDto.senderType == 1 ? true : false;
  // const date = new Date(messageDto.timeStamp);
  // const niceTimeStamp = `${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`;
  message.classList.add("message");
  // message.textContent = `${niceTimeStamp} - ${senderIsClient ? 'User' : 'OPE'} says:  ${messageDto.content}`;
  const chatContent = `<p>${messageDto.content}</p>`;
  message.innerHTML = chatContent;
  message.classList.add(senderIsClient ? "outgoing" : "incoming");
  // document.getElementById("messages").appendChild(messageElement);

  messagesList.appendChild(message);
  messagesList.scrollTo(0, messagesList.scrollHeight);
});


chatTogglerBtn.addEventListener("click", async () => {
  try {
    // await startConnection();
    document.body.classList.toggle("show-chat");
    chatTogglerBtn.innerText === "mode_comment" ? chatTogglerBtn.innerHTML = "close" : chatTogglerBtn.innerHTML = "mode_comment"

  } catch (error) {
    console.log(error)
  }

});


// TODO:  Ver que onda con esto, lo dejamos? o es al pedo

connection.on("OperatorJoined", (message) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", "incoming");
  messageElement.textContent = `ADMIN says:  ${message}`;
  document.getElementById("messages").appendChild(messageElement);

  // const message = document.createElement("li");
  // const senderIsClient = messageDto.senderType == 1 ? true : false;
  // // const date = new Date(messageDto.timeStamp);
  // // const niceTimeStamp = `${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`;
  //  message.classList.add("message", className);
  // // message.textContent = `${niceTimeStamp} - ${senderIsClient ? 'User' : 'OPE'} says:  ${messageDto.content}`;
  // const chatContent = `<p>${messageDto.content}</p>`;
  // message.innerHTML = chatContent;
  // message.classList.add(senderIsClient ? "outgoing" : "incoming");
  // document.getElementById("messages").appendChild(messageElement);
});


const sendIdentityData = async (customerData) => {
  const rawResponse = await fetch(`${apiUrl}/customer/get-by-phone/${customerData.phone}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  });
  const content = await rawResponse.json();

  let noError = true;
  if (rawResponse.ok) {
    // saveChat({ source: 1, messages: [], customerId: content.id });
    EmbedContext.customerId = content.id;
  } else if (rawResponse.status == 404) {
    createCustomer(customerData);
  } else {
    noError = false;
    //TODO: Agarrar el error
  }

  if (noError) {
    fetchNextNode(flowId);
  }

};

const createCustomer = async (customerDto) => {
  const rawResponse = await fetch(`${apiUrl}/customer`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(customerDto)
  });
  const content = await rawResponse.json();

  if (rawResponse.ok) {
    EmbedContext.customerId = content.id;
    // saveChat({ source: 1, messages: [], customerId: content.id });
  } else {
    //TODO: Agarrar el error
  }

};

const saveChat = async (chatDto) => {
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
    // if (!userMessage) return;

    // Agrega el mensaje al listado
    // messagesList.appendChild(createMessage(userMessage, "outgoing"));
    // messagesList.scrollTo(0, messagesList.scrollHeight);

    // Placeholder de respuesta
    // setTimeout(() => {
    //   messagesList.appendChild(createMessage("...", "incoming"));
    //   messagesList.scrollTo(0, messagesList.scrollHeight);
    // }, 600)

    if (EmbedContext.messageList.length === 0) {
      const name = document.getElementById('customer-name').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();
      sendIdentityData({ name, phone });
      chatInputText.removeAttribute('disabled');
      EmbedContext.messageList.push(`Nombre: ${name} | Celular: ${phone}`);
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
    if (!response.ok) throw new Error("No se pudo obtener el nodo siguiente.");
    const nextNodes = await response.json();
    console.log({ nextNodes });
    nextNodes.forEach(node => processNode(node));

  } catch (err) {
    console.error(err.message);
  } finally {
    removeLoadingIndicator();
  }
}

const processNode = async (node) => {
  console.log('Procesando nodo', { node });
  if (node.type === "textNode") {
    const message = document.createElement("li");
    const chatContent = `<p>${node.data.label}</p>`;
    message.classList.add("message");
    message.innerHTML = chatContent;
    message.classList.add("incoming");
    messagesList.appendChild(message);

    messagesList.scrollTo(0, messagesList.scrollHeight);

    fetchNextNode(flowId, node.id);
  } else if (node.type === "buttonNode") {

    const button = document.createElement('button');
    button.textContent = node.data.label;
    button.onclick = () => fetchNextNode(flowId, node.id);
    messagesList.appendChild(button);

  } else if (node.type === "actionNode") {
    displayLoadingIndicator();

    if (node.data.label == "Llamar Operador") {
      await startConnection();
      saveChat({ source: 1, messages: [], customerId: EmbedContext.customerId });
    }

    fetchNextNode(flowId, node.id);
  }
}

const displayLoadingIndicator = () => {
  // messagesList.appendChild(createMessage("...", "incoming"));
  console.log('Esperando nodo...');
}
const removeLoadingIndicator = () => {
  console.log('HAY respuesta del backend');
}




sendBtn.addEventListener("click", newUserMessage);
chatInputText.addEventListener('keydown', function (e) { e.key == 'Enter' && newUserMessage });
chatInputText.setAttribute('disabled', true);

