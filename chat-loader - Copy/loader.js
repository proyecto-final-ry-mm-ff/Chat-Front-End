
(() => {

    const script = document.currentScript;

    const loadChatWidget = () => {
        
        const chatWidget = document.createElement("div");
        const chatWidgetStyle = chatWidget.style;

        chatWidgetStyle.display = "none";
        chatWidgetStyle.boxSizing = "border-box";
        chatWidgetStyle.width = "400px";
        chatWidgetStyle.height = "647px";
        chatWidgetStyle.position = "absolute";
        chatWidgetStyle.bottom = "40px";
        chatWidgetStyle.right = "40px";

        const iframe = document.createElement("iframe");

        const iframeStyle = iframe.style;
        iframeStyle.boxSizing = "borderBox";
        iframeStyle.position = "absolute";
        iframeStyle.right = 0;
        iframeStyle.bottom = 0;
        iframeStyle.width = "100%";
        iframeStyle.height = "100%";
        iframeStyle.border = 0;
        iframeStyle.margin = 0;
        iframeStyle.padding = 0;
        iframeStyle.width = "500px";

        chatWidget.appendChild(iframe);

        iframe.addEventListener("load", () => chatWidgetStyle.display = "block");

        const chatWidgetUrl = `http://localhost:3000`; // para probar esto hay que correr el chat en un puerto y el html de prueba en otro hasta tener algun lugar donde hostear el chat y una página real donde probarlo

        iframe.src = chatWidgetUrl;

        document.body.appendChild(chatWidget);
    }

    if(document.readyState === "complete"){
        loadChatWidget();        
    }
    else{
        document.addEventListener("readystatechange", () => {
            if(document.readyState === "complete"){
                loadChatWidget();
            }
        });
    }

})();