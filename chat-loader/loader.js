
(() => {

    const script = document.currentScript;

    const targetScriptUrl = new URL(script.src);
    // const apiUrl = 'https://sherlock-api-bbhahnh2fghza4b8.canadacentral-01.azurewebsites.net';
    const apiUrl = process.env.API_URL;
    const token = targetScriptUrl.searchParams.get('token');
    const webId = targetScriptUrl.searchParams.get('webId');


    const loadChatWidget = () => {
        const chatWidget = document.createElement("div");
        const chatWidgetStyle = chatWidget.style;

        chatWidgetStyle.display = "none";
        chatWidgetStyle.boxSizing = "border-box";
        chatWidgetStyle.width = "400px";
        chatWidgetStyle.height = "647px";
        chatWidgetStyle.position = "sticky";
        chatWidgetStyle.bottom = "0";
        chatWidgetStyle.right = "40px";
        chatWidgetStyle.left = "calc(93% - 400px)";

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

        const chatWidgetUrl = process.env.WIDGET_URL + `/?clientId=${webId}`;

        iframe.src = chatWidgetUrl;

        document.body.appendChild(chatWidget);
    }

    const identifyMe = async () => {
        try {
            const response = await fetch(`${apiUrl}/client/authenticate?webId=${webId}&token=${token}`, {
                method: "POST",
            });

            if (!response.ok) {
                console.error("Error en la autenticación:", response.status, response.statusText);
                return;
            }

            const authorize = await response.json();
            console.log("Autenticación exitosa:", authorize);

            // Cargar el chat solo si la autenticación es correcta
            loadChatWidget();
        } catch (error) {
            console.error("Error en la conexión con el backend:", error);
        }
    };


    if (document.readyState === "complete") {
        identifyMe();

    }
    else {
        document.addEventListener("readystatechange", () => {
            if (document.readyState === "complete") {
                identifyMe();
            }
        });
    }

})();