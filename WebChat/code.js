
let sendBtn = document.getElementById("send-btn");
let userMessage;
const messagesList = document.querySelector(".messages-list");
const chatTogglerBtn = document.querySelector(".chat-toggle-btn");

const EmbedContext = {};



const apiUrl = "http://localhost:5015";
const wssUrl = "http://localhost:5056/chat-hub";


// async function identifyMe() {
//   console.log("Paso 1 - Me identifico como Web que paga el servicio...");
//   const response = await fetch(`${apiUrl}/auth/auth-web`, {
//     headers: { "Content-Type": "application/json" },
//     method: "POST",
//     body: JSON.stringify({ webId: "abc2173801", token: "WEB1" }),
//   });
//   //Capaz esto es al pedo
//   const authorize = await response.json();
//   console.log({ authorize });
//   if (response.ok) {
//     startConnection();
//     // getChatContext();
//   }
// }
// identifyMe();

const connection = new signalR.HubConnectionBuilder()
  .withUrl(wssUrl, EmbedContext.params) // Cambia el puerto si es necesario
  .build();

// Conéctate al hub
async function startConnection() {
  try {
    await connection.start();
    console.log("3 - Conectado al Hub de SignalR");
    console.log("4 - Quiero hablar con el operador...");
    await connection.invoke("RequestHelp");
  } catch (err) {
    console.error("Error al conectar con el Hub de SignalR", err);
    //  setTimeout(startConnection, 5000); // Reintento en caso de fallo
  }
}

// connection.on("JoinChat", (chatConnectionId) => {
//   EmbedContext.chatId = chatConnectionId;
// });

connection.on("ChatStarted", (chatConnectionId) => {
  EmbedContext.chatId = chatConnectionId;
});






const newUserMessage = async () => {
  try {
    let chatInputText = document.getElementById("text");
    userMessage = chatInputText.value.trim();
    // if (!userMessage) return;
    // chatInputText.value = "";

    // Agrega el mensaje al listado
    // messagesList.appendChild(createMessage(userMessage, "outgoing"));
    // messagesList.scrollTo(0, messagesList.scrollHeight);

    // Placeholder de respuesta
    // setTimeout(() => {
    //   messagesList.appendChild(createMessage("...", "incoming"));
    //   messagesList.scrollTo(0, messagesList.scrollHeight);
    // }, 600)
    console.log(EmbedContext.chatId);
    //El 1 acá es el senderType USUARIO_FINAL
    await connection.invoke("SendMessageToChat", EmbedContext.chatId, 1, userMessage);
  } catch (err) {
    console.error("Error al enviar mensaje:", err);
  }

  // Llamada a la api 
  /*(async () => {
    const rawResponse = await fetch('http://localhost:5015/api/chat', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({'name': text})
    });
    const content = await rawResponse.json();  
    
  });*/
}

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


// Crea nueva línea para agregar el mensaje al chat
// const createMessage = (messageText, className) => {
//   const message = document.createElement("li");
//   message.classList.add("message", className);
//   let chatContent = `<p>${messageText}</p>`;
//   message.innerHTML = chatContent;
//   return message; // holaaaa
// }

sendBtn.addEventListener("click", newUserMessage);

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
