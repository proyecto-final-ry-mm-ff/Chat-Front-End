
let sendBtn = document.getElementById("send-btn");
let userMessage;
const messagesList = document.querySelector(".messages-list"); 
const chatTogglerBtn = document.querySelector(".chat-toggle-btn");

// Crea nueva línea para agregar el mensaje al chat
const createMessage = (messageText, className) => {
  const message = document.createElement("li");
  message.classList.add("message", className);
  let chatContent = `<p>${messageText}</p>`;
  message.innerHTML = chatContent;
  return message; // holaaaa
}

const newUserMessage = () => {
  let chatInputText = document.getElementById("text");
  userMessage = chatInputText.value.trim();
  if(!userMessage) return;
  chatInputText.value = "";

  // Agrega el mensaje al listado
  messagesList.appendChild(createMessage(userMessage, "outgoing")); 
  messagesList.scrollTo(0, messagesList.scrollHeight);

  // Placeholder de respuesta
  setTimeout( () => {
    messagesList.appendChild(createMessage("...", "incoming")); 
    messagesList.scrollTo(0, messagesList.scrollHeight);
  }, 600)

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

sendBtn.addEventListener("click", newUserMessage); 

chatTogglerBtn.addEventListener("click", () => {
  document.body.classList.toggle("show-chat");
  chatTogglerBtn.innerText === "mode_comment" ? chatTogglerBtn.innerHTML = "close" : chatTogglerBtn.innerHTML = "mode_comment"});
