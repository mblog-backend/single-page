(function () {
  if (mblogConfig.url.endsWith("/")) {
    mblogConfig.url = mblogConfig.url.substring(0, mblogConfig.url.length - 1);
  }
  const loadJS = (url, async = true, type = "text/javascript") => {
    return new Promise((resolve, reject) => {
      try {
        const scriptEle = document.createElement("script");
        scriptEle.type = type;
        scriptEle.async = async;
        scriptEle.src = url;
        scriptEle.addEventListener("load", (ev) => {
          resolve({ status: true });
        });

        scriptEle.addEventListener("error", (ev) => {
          reject({
            status: false,
            message: `Failed to load the script ${url}`,
          });
        });

        document.body.appendChild(scriptEle);
      } catch (error) {
        reject(error);
      }
    });
  };

  const loadCSS = (urls) => {
    urls.forEach((url) => {
      var head = document.getElementsByTagName("head")[0];
      var style = document.createElement("link");
      style.href = url;
      style.type = "text/css";
      style.rel = "stylesheet";
      head.append(style);
    });
  };

  const showToast = (msg) => {
    new Notify({
      status: "success",
      customClass: "mblog-toast",
      text: msg,
      autoclose: true,
      autotimeout: 2000,
      showCloseButton: false,
      effect: "slide",
      gap: 20,
      distance: 20,
      type: 1,
      position: "center",
    });
  };

  const loadComment = async (ele) => {
    const res = await fetch(`${mblogConfig.url}/api/comment/query`, {
      body: JSON.stringify({
        page: 1,
        size: 100,
        memoId: parseInt(ele.dataset.id),
      }),
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });
    const json = await res.json();
    const parent = ele.parentNode;
    let result = "";
    json.data.list.forEach((item) => {
      result =
        result +
        `<div class="comment-item">
            <div class="comment-content">${item.content}</div>
            <div class="comment-toolbar">
              <div class="comment-author">${item.userName}</div>
              <div class="comment-time">${dayjs(item.created).format(
                "YYYY-MM-DD HH:mm"
              )}</div>
              ${
                item.email
                  ? `<div><a href='mailto:${item.email}'>邮箱</a></div>`
                  : ""
              }
              ${
                item.link
                  ? `<div><a href='${item.link}' target="_blank">网址</a></div>`
                  : ""
              }
            </div>
          </div>`;
    });
    parent.querySelector(".comment-list").innerHTML = result;
  };

  const publisComment = async (id, input, usernameInput, email, link) => {
    if (!input.value || !input.value.trim()) {
      return;
    }
    const res = await fetch(`${mblogConfig.url}/api/comment/add`, {
      body: JSON.stringify({
        content: input.value,
        memoId: id,
        username: usernameInput.value || "匿名",
        email: email.value,
        link: link.value,
      }),
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });
    const json = await res.json();
    if (json.code === 0) {
      showToast("评论成功,请等待审核!");
      loadComment(input.parentNode.previousElementSibling);
      input.value = "";
      usernameInput.value = "";
    } else {
      showToast(json.msg || "评论失败！");
    }
  };

  const loadMblogs = async () => {
    const res = await fetch(`${mblogConfig.url}/api/memo/list`, {
      body: JSON.stringify({
        page: 1,
        size: 50,
        userId: mblogConfig.userId,
      }),
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });
    const json = await res.json();
    const items = json.data.items;

    let result = "";
    items.forEach((item) => {
      result =
        result +
        `<div class="memo">
            <div class="toolbar">
            <div class="time">${dayjs(item.created).format(
              "YYYY-MM-DD HH:mm"
            )}</div>
          </div>
          <div class="md-content">
            ${marked.parse(item.content)}
          </div>
          ${
            item.resources
              ? `<div class="imgs">${item.resources
                  .map((res) => {
                    const thumbnail = res.url + (res.suffix || "");
                    const thumbnailHref =
                      res.storageType === "LOCAL"
                        ? mblogConfig.url + thumbnail
                        : thumbnail;
                    const url =
                      res.storageType === "LOCAL"
                        ? mblogConfig.url + res.url
                        : res.url;
                    return `<img src="${thumbnailHref}" data-url="${url}" />`;
                  })
                  .join(" ")}</div>`
              : ""
          }
          <div class="comment" >
              <div class="btn comment-btn" data-id="${
                item.id
              }">展开评论</div>            
              <div class="comment-wrapper">
                  <textarea class="comment-input"></textarea>
                  <div style="display:flex;gap:5px;">
                    <div class="btn comment-publish" data-id="${
                      item.id
                    }">发布</div>
                    <input type="text" placeholder="用户名,不填默认取'匿名'"/>
                    <input type="text" placeholder="邮箱,可空"/>
                    <input type="text" placeholder="网址,可空"/>
                  </div>
                <div class="comment-list"></div>     
              </div>   
          </div>
        </div>`;
    });

    const mblogEle = document.querySelector("#mblog");
    mblogEle.innerHTML = result;

    if (!mblogConfig.openComment) {
      const list = document.querySelectorAll("#mblog .comment");
      list.forEach((ele) => {
        ele.parentNode.removeChild(ele);
      });
    }

    mblogEle.addEventListener("click", (e) => {
      console.log(e.target);
      if (e.target.classList.contains("comment-btn")) {
        const display = e.target.nextElementSibling.style.display;
        if (display == "block") {
          e.target.nextElementSibling.style.display = "none";
        } else {
          e.target.nextElementSibling.style.display = "block";
          loadComment(e.target);
        }
      } else if (e.target.classList.contains("comment-publish")) {
        publisComment(
          e.target.dataset.id,
          e.target.parentNode.previousElementSibling,
          e.target.nextElementSibling,
          e.target.nextElementSibling.nextElementSibling,
          e.target.nextElementSibling.nextElementSibling.nextElementSibling
        );
      } else if (e.target.matches(".imgs img")) {
        const mask = document.createElement("div");
        mask.setAttribute("id", "mblog-mask");
        mask.style.top = window.scrollY + "px";
        document.body.insertAdjacentElement("beforeend", mask);
        document.body.classList.add("mblog-stop-scrolling");

        const preview = document.createElement("div");
        preview.setAttribute("id", "mblog-mask-preview");
        preview.innerHTML = `<img src="${e.target.dataset.url}"/>`;
        preview.style.top = `calc(${window.scrollY + "px"} + 50%)`;
        document.body.insertAdjacentElement("beforeend", preview);
      }
    });
  };

  document.body.addEventListener("click", (e) => {
    if (
      e.target.matches("#mblog-mask-preview") ||
      e.target.matches("#mblog-mask") ||
      e.target.matches("#mblog-mask-preview img")
    ) {
      document.body.removeChild(document.querySelector("#mblog-mask"));
      document.body.removeChild(document.querySelector("#mblog-mask-preview"));
      document.body.classList.remove("mblog-stop-scrolling");
    }
  });

  addEventListener("DOMContentLoaded", (event) => {
    loadCSS([
      "https://cdn.staticfile.org/lxgw-wenkai-screen-webfont/1.7.0/lxgwwenkaiscreen.min.css",
      "https://cdn.jsdelivr.net/npm/simple-notify@0.5.5/dist/simple-notify.min.css",
      "https://cdn.kingwrcy.cn/mblog/static/v1/static.css",
      // "static.css",
    ]);
    Promise.all([
      loadJS("https://cdn.jsdelivr.net/npm/dayjs@1.11.8/dayjs.min.js"),
      loadJS("https://cdn.jsdelivr.net/npm/marked/marked.min.js"),
      loadJS("https://cdn.jsdelivr.net/npm/mustache@4.2.0/mustache.min.js"),
      loadJS(
        "https://cdn.jsdelivr.net/npm/simple-notify@0.5.5/dist/simple-notify.min.js"
      ),
    ]).then(() => {
      marked.use({ mangle: false, headerIds: false });
      loadMblogs();
    });
  });
})();
