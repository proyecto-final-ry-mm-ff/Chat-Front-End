const EmbedContext = {};
EmbedContext.messageList = [];

const apiUrl = "http://localhost:5015";
const wssUrl = "http://localhost:5056/chat-hub";
const messagesList = document.querySelector(".messages-list");
const chatTogglerBtn = document.querySelector(".chat-toggle-btn");
const connection = new signalR.HubConnectionBuilder()
  .withUrl(wssUrl)
  .build();

const sendBtn = document.getElementById("send-btn");
const chatInputText = document.getElementById("text");




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
    await startConnection();
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

  console.log("Customer encontrado?", { content });

  if (rawResponse.ok) {
    saveChat({ source: 1, messages: [], customerId: content.id });
  } else if (rawResponse.status == 404) {
    createCustomer(customerData);
  } else {
    //TODO: Agarrar el error
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

  console.log("Customer creado", { content });

  if (rawResponse.ok) {
    saveChat({ source: 1, messages: [], customerId: content.id });
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
      chatInputText.setAttribute('disabled', false);
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




sendBtn.addEventListener("click", newUserMessage);
chatInputText.setAttribute('disabled', true);

