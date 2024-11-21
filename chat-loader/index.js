
(function (){
    const content = document.getElementById("message");
    const send = document.getElementById("send");
    const hide = document.getElementById("hide");
    const show = document.getElementById("show");
    const toggle = document.getElementById("toggle");

    const changeButtonState = () => {
        show.disabled = !show.disabled;
        hide.disabled = !show.disabled;
    }

    widgetApi().then( api => {

        hide.disabled = false;
        toggle.disabled = false;

        send.addEventListener("click", () => {
            const value = content.value;
            if(value.length > 0) {
                api.sendMessage(value);
                content.value = "";
            }
        });

        hide.addEventListener("click", () => {
            changeButtonState();
            api.hide();
        });

        show.addEventListener("click", () => {
            changeButtonState();
            api.show();
        });

        toggle.addEventListener("click", () => {
            changeButtonState();
            api.toggle();
        });

        api.onHide = () => changeButtonState();
    });

})();