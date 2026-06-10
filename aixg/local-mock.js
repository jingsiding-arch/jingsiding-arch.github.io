(function () {
  var STORAGE_KEY = "aixg_local_mock_state_v1";
  var TOKEN_KEY = "aixg_local_token";
  var DORM_RE = /(排宿|宿舍|床位|新生住宿|住宿方案)/;
  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  var nativeXHROpen = XMLHttpRequest.prototype.open;
  var nativeXHRSend = XMLHttpRequest.prototype.send;
  var nativeXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  var nativeXHRAbort = XMLHttpRequest.prototype.abort;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return [prefix, Date.now(), Math.random().toString(36).slice(2, 8)].join("_");
  }

  function dormReportAnswer(question) {
    return [
      "## 排宿任务理解",
      "已按“今年新生、院系、性别、楼栋、楼层、房间、床位”六个维度启动分析。",
      "",
      "## 需求预测",
      "- 预计今年新生需床位 **4500** 张",
      "- 男生需求 **2300** 张，女生需求 **2200** 张",
      "- 近三年报到率整体稳定，女生资源压力更集中",
      "",
      "## 资源盘点",
      "- 当前可调配床位约 **3800** 张",
      "- 空房 **86** 间，未满房 **118** 间",
      "- 名义空床位充足，但连续可分配资源不足，存在结构性缺口",
      "",
      "## 建议方案",
      "1. 优先启用 5 栋、8 栋、3 栋共 42 间房",
      "2. 优先保障商学院、外国语学院等 5 个院系集中入住",
      "3. 保留约 96 张机动床位，防止报到高峰期二次腾挪",
      "",
      "## 汇报口径",
      "今年排宿压力主要不是总量不足，而是连续资源不足。建议优先使用整层空房，再补连续未满房，兼顾男女分宿与院系集中管理。",
      "",
      "> 原始问题：" + question,
    ].join("\n");
  }

  function genericAnswer(question) {
    return [
      "## 本地演示回复",
      "当前页面已切换到本地 mock 模式，首页、历史记录、模型列表和会话接口均可直接运行。",
      "",
      "### 我理解你的问题",
      question,
      "",
      "### 建议",
      "- 如果你想看结构化排宿流程，可以直接输入“讨论一下今年的排宿方案”",
      "- 如果你想继续保留原站首页风格，本地环境已经不再依赖后端接口",
      "",
      "### 当前状态",
      "首页推荐语、历史会话、模型下拉、会话创建与本地聊天记录都已接入本地数据。",
    ].join("\n");
  }

  function buildSuggestions() {
    return JSON.stringify([
      { question: "讨论一下今年的排宿方案" },
      { question: "分析今年新生床位缺口" },
      { question: "给出院系集中入住建议" },
      { question: "输出宿舍安全巡查提醒文案" },
      { question: "帮我总结本周学生工作重点" },
      { question: "整理辅导员例会纪要模板" },
    ]);
  }

  function createDefaultState() {
    return {
      platformInfo: {
        id: "109979",
        unitId: "109979",
        xxmc: "武汉大学",
        slogan: "数据驱动管理，赋能精准决策",
        tjwt: buildSuggestions(),
        ico: "/favicon.ico",
        aimc: "学工超级智能体",
        logo: "/images/logo.png",
      },
      templates: [
        {
          id: "tpl_attendance_weekly",
          bt: "学工值班日报",
          ms: "汇总当日重点事项、学生诉求与风险提醒",
          yx: "",
          zy: "",
          bj: "",
          dg: JSON.stringify([
            { id: 1, title: "当日重点工作", desc: "梳理今日已完成与待跟进事项" },
            { id: 2, title: "风险关注清单", desc: "聚焦重点学生、宿舍异常、请假波动" },
          ]),
          ksrq: "",
          jsrq: "",
        },
      ],
      cmcTree: [
        {
          value: "yx_01",
          label: "商学院",
          type: "y",
          children: [
            {
              value: "zy_0101",
              label: "金融学",
              type: "z",
              children: [{ value: "bj_010101", label: "金融学 2026 级 1 班", type: "b" }],
            },
          ],
        },
        {
          value: "yx_02",
          label: "外国语学院",
          type: "y",
          children: [
            {
              value: "zy_0201",
              label: "英语",
              type: "z",
              children: [{ value: "bj_020101", label: "英语 2026 级 1 班", type: "b" }],
            },
          ],
        },
      ],
      conversations: [],
      models: [
        { id: "deepseek-v3", modelName: "DeepSeek-V3" },
        { id: "glm-4.5", modelName: "GLM-4.5" },
        { id: "qwen-max", modelName: "通义千问3-Max" },
      ],
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var initial = createDefaultState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      var parsed = JSON.parse(raw);
      return Object.assign(createDefaultState(), parsed);
    } catch (error) {
      console.warn("[local-mock] load state failed, reset default state", error);
      var fallback = createDefaultState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      return fallback;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function ensureToken() {
    var token = localStorage.getItem(TOKEN_KEY) || "local-mock-token";
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  }

  function getUserPayload(state) {
    return {
      currentRoleId: "role_super_admin",
      permissions: ["*"],
      roles: [
        { id: "role_super_admin", rolename: "超级管理员", rolecode: "001", roletype: "1" },
        { id: "role_counselor", rolename: "辅导员", rolecode: "002", roletype: "2" },
      ],
      user: {
        name: "何赐鸿",
        username: "15177761685",
        avatar: "",
        user: {
          id: "user_15177761685",
          bh: "15177761685",
          userType: "0",
        },
      },
      unitInfo: {
        unitId: state.platformInfo.unitId,
        homePageType: "3",
        sfxgmm: "1",
        loginUrl: "",
      },
      xzpyccxgzt: "0",
    };
  }

  function getConversationTitle(question) {
    var title = question.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title) {
      return "新对话";
    }
    return title.length > 18 ? title.slice(0, 18) + "..." : title;
  }

  function getAnswerForQuestion(question) {
    return DORM_RE.test(question) ? dormReportAnswer(question) : genericAnswer(question);
  }

  function createConversationRecord(turn, conversationId) {
    return {
      conversationId: conversationId,
      createDate: turn.createDate,
      totalWordCount: turn.question.length + turn.answer.length,
      inputToken: Math.max(40, turn.question.length * 3),
      consumerToken: Math.max(80, turn.answer.length * 2),
      questionMessages: [
        {
          role: "user",
          content_type: "text",
          content: turn.question,
        },
      ],
      answer: [
        {
          type: "llm",
          status: "completed",
          message: {
            content: turn.answer,
            full_content: turn.answer,
            data_sources: [],
          },
        },
      ],
    };
  }

  function getConversationList(state) {
    return state.conversations
      .slice()
      .sort(function (a, b) {
        return new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime();
      })
      .map(function (item) {
        return {
          id: item.id,
          conversationName: item.title,
          updateDate: item.updateDate,
        };
      });
  }

  function getConversationRecords(state, conversationId) {
    var conversation = state.conversations.find(function (item) {
      return item.id === conversationId;
    });
    if (!conversation) {
      return [];
    }
    return conversation.turns.map(function (turn) {
      return createConversationRecord(turn, conversation.id);
    });
  }

  function appendConversationTurn(conversationId, question, answer) {
    var state = loadState();
    var conversation = state.conversations.find(function (item) {
      return item.id === conversationId;
    });
    if (!conversation) {
      conversation = {
        id: conversationId,
        title: getConversationTitle(question),
        updateDate: nowIso(),
        turns: [],
      };
      state.conversations.unshift(conversation);
    }
    if (!conversation.title || conversation.title === "新对话") {
      conversation.title = getConversationTitle(question);
    }
    conversation.updateDate = nowIso();
    conversation.turns.push({
      id: makeId("turn"),
      question: question,
      answer: answer,
      createDate: nowIso(),
    });
    saveState(state);
  }

  function getPathname(input) {
    try {
      return new URL(input, window.location.origin).pathname;
    } catch (error) {
      return input;
    }
  }

  function getSearchParams(input) {
    try {
      return new URL(input, window.location.origin).searchParams;
    } catch (error) {
      return new URLSearchParams();
    }
  }

  function parseBody(body, headers) {
    if (!body) {
      return null;
    }
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (error) {
        return body;
      }
    }
    if (body instanceof FormData) {
      var result = {};
      body.forEach(function (value, key) {
        result[key] = value;
      });
      return result;
    }
    return body;
  }

  function makeJsonEnvelope(data) {
    return {
      code: 200,
      message: "success",
      data: data,
    };
  }

  function createTextStream(chunks, interval) {
    return new ReadableStream({
      start: function (controller) {
        var index = 0;
        function pushNext() {
          if (index >= chunks.length) {
            controller.close();
            return;
          }
          controller.enqueue(new TextEncoder().encode(chunks[index]));
          index += 1;
          window.setTimeout(pushNext, interval || 140);
        }
        pushNext();
      },
    });
  }

  function createChatEvents(question, answer) {
    var preview = answer.length > 180 ? answer.slice(0, 180) : answer;
    return [
      {
        status: "processing",
        message: {
          full_reasoning_content: "正在理解问题，梳理任务目标与所需数据维度。",
        },
      },
      {
        status: "processing",
        multi_queries: [question],
        message: {
          full_content: preview,
          content: preview,
        },
      },
      {
        status: "completed",
        usage: {
          prompt_tokens: Math.max(60, question.length * 3),
          completion_tokens: Math.max(120, answer.length * 2),
          total_tokens: Math.max(180, question.length * 3 + answer.length * 2),
        },
        message: {
          full_content: answer,
          content: answer,
          data_sources: [],
        },
      },
    ];
  }

  function createParseTemplateEvents() {
    return [
      { responseType: "PROGRESS", status: "completed", currentStep: "上传模板", progress: 20 },
      {
        responseType: "EXCEL_PARSED",
        excelHeaders: ["姓名", "学号", "性别", "院系", "专业", "班级"],
      },
      {
        responseType: "SYSTEM_FIELDS_LOADED",
        systemFields: ["xm", "xh", "xb", "yx", "zy", "bj"],
      },
      {
        responseType: "AI_MATCHING_COMPLETED",
        matchedFields: [
          { fieldCode: "xm", fieldName: "姓名" },
          { fieldCode: "xh", fieldName: "学号" },
          { fieldCode: "xb", fieldName: "性别" },
          { fieldCode: "yx", fieldName: "院系" },
          { fieldCode: "zy", fieldName: "专业" },
          { fieldCode: "bj", fieldName: "班级" },
        ],
        unmatchedHeaders: [],
      },
    ];
  }

  function mockUploadResponse(file, image) {
    if (image) {
      return makeJsonEnvelope({
        imageUrl:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='120' viewBox='0 0 180 120'%3E%3Crect width='180' height='120' rx='18' fill='%23FFF4EB'/%3E%3Ctext x='90' y='64' font-size='18' text-anchor='middle' fill='%23F98141' font-family='sans-serif'%3E本地图片%3C/text%3E%3C/svg%3E",
      });
    }

    return makeJsonEnvelope({
      json: {
        id: makeId("file"),
        fileName: (file && file.name) || "本地上传文件.xlsx",
        status: 2,
      },
    });
  }

  function routeMock(request) {
    var state = loadState();
    var pathname = request.pathname;
    var method = request.method.toUpperCase();
    var params = request.searchParams;
    var body = request.body;

    if (pathname === "/pedestal/user/verifyDomain" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope({ boolean: true }) };
    }

    if (pathname === "/pedestal/system/unitAIInfo/getUnitAIInfo" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope({ info: state.platformInfo }) };
    }

    if (pathname === "/pedestal/system/unitAIInfo/updateOtherInfo" && method === "POST") {
      state.platformInfo = Object.assign({}, state.platformInfo, body || {});
      saveState(state);
      return { type: "json", body: makeJsonEnvelope(true) };
    }

    if ((pathname === "/pedestal/user/ermLogin" || pathname === "/pedestal/user/ydLogin" || pathname === "/pedestal/user/login") && method === "GET") {
      return { type: "json", body: makeJsonEnvelope({ token: ensureToken() }) };
    }

    if (pathname === "/pedestal/user/loginOut") {
      return { type: "json", body: makeJsonEnvelope(true) };
    }

    if (pathname === "/pedestal/user/getInfox" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope(getUserPayload(state)) };
    }

    if (pathname === "/pedestal/user/getQhjsUrl" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope({ qhjsUrl: "" }) };
    }

    if (pathname === "/pedestal/user/getZhAndJsList" && method === "GET") {
      return {
        type: "json",
        body: makeJsonEnvelope({
          userList: [
            {
              id: "user_15177761685",
              roleList: getUserPayload(state).roles,
            },
          ],
        }),
      };
    }

    if (pathname === "/pedestal/user/switchAccount" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope({ token: ensureToken() }) };
    }

    if (pathname === "/pedestal/common/college/getYzbPre" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope({ list: state.cmcTree }) };
    }

    if (pathname === "/pedestal/system/aiscgsmb/selectPage" && method === "POST") {
      return { type: "json", body: makeJsonEnvelope({ list: state.templates, total: state.templates.length }) };
    }

    if (pathname === "/pedestal/system/aiscgsmb/add" && method === "POST") {
      var newTemplate = Object.assign({ id: makeId("tpl") }, body || {});
      state.templates.unshift(newTemplate);
      saveState(state);
      return { type: "json", body: makeJsonEnvelope(true) };
    }

    if (pathname === "/pedestal/system/aiscgsmb/edit" && method === "POST") {
      state.templates = state.templates.map(function (item) {
        return item.id === body.id ? Object.assign({}, item, body) : item;
      });
      saveState(state);
      return { type: "json", body: makeJsonEnvelope(true) };
    }

    if (pathname.indexOf("/pedestal/system/aiscgsmb/del/") === 0 && method === "POST") {
      var templateId = pathname.split("/").pop();
      state.templates = state.templates.filter(function (item) {
        return item.id !== templateId;
      });
      saveState(state);
      return { type: "json", body: makeJsonEnvelope(true) };
    }

    if (pathname === "/aibase/aiCenter/getModelList" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope(state.models) };
    }

    if (pathname === "/aibase/aiCenter/getConversationList" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope(getConversationList(state)) };
    }

    if (pathname === "/aibase/aiCenter/createConversation" && method === "GET") {
      var conversationId = makeId("conv");
      state.conversations.unshift({
        id: conversationId,
        title: "新对话",
        updateDate: nowIso(),
        turns: [],
      });
      saveState(state);
      return { type: "json", body: makeJsonEnvelope(conversationId) };
    }

    if (pathname === "/aibase/aiCenter/getConversationRecordList" && method === "GET") {
      return {
        type: "json",
        body: makeJsonEnvelope(getConversationRecords(state, params.get("conversationId") || "")),
      };
    }

    if (pathname.indexOf("/aibase/aiCenter/deleteConversation/") === 0 && method === "POST") {
      var conversationDeleteId = pathname.split("/").pop();
      state.conversations = state.conversations.filter(function (item) {
        return item.id !== conversationDeleteId;
      });
      saveState(state);
      return { type: "json", body: makeJsonEnvelope(true) };
    }

    if (pathname === "/aibase/aiCenter/getAiCenterCasUrl" && method === "GET") {
      return { type: "json", body: makeJsonEnvelope("") };
    }

    if (pathname === "/pedestal/upload/uploadFile" && method === "POST") {
      return { type: "json", body: mockUploadResponse(body && body.file, false) };
    }

    if (pathname === "/pedestal/upload/uploadImage" && method === "POST") {
      return { type: "json", body: mockUploadResponse(body && body.file, true) };
    }

    if (pathname === "/aibase/aiCenter/chat" && method === "POST") {
      var question = "";
      if (body && body.userMessage && body.userMessage.length) {
        var userPart = body.userMessage.find(function (item) {
          return item.content_type === "text";
        });
        question = (userPart && userPart.content) || "";
      }
      var answer = getAnswerForQuestion(question);
      appendConversationTurn(body.conversationId, question, answer);
      return {
        type: "stream",
        body: createChatEvents(question, answer),
      };
    }

    if (pathname === "/aibase/aiCenter/parseExcelTemplateStreaming" && method === "POST") {
      return {
        type: "stream",
        body: createParseTemplateEvents(),
      };
    }

    return null;
  }

  function responseToText(payload) {
    return typeof payload === "string" ? payload : JSON.stringify(payload);
  }

  function buildHeaderMap(headers) {
    var result = {};
    Object.keys(headers || {}).forEach(function (key) {
      result[key.toLowerCase()] = headers[key];
    });
    return result;
  }

  function emitXHREvent(xhr, type) {
    try {
      var event = new Event(type);
      if (typeof xhr["on" + type] === "function") {
        xhr["on" + type](event);
      }
      if (typeof xhr.dispatchEvent === "function") {
        xhr.dispatchEvent(event);
      }
    } catch (error) {
      if (typeof xhr["on" + type] === "function") {
        xhr["on" + type]({ type: type, target: xhr });
      }
    }
  }

  function setXHRValue(xhr, key, value) {
    try {
      Object.defineProperty(xhr, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: value,
      });
    } catch (error) {
      try {
        xhr[key] = value;
      } catch (noop) {}
    }
  }

  function sendMockXHR(xhr, result) {
    var status = 200;
    var headers = { "Content-Type": "application/json" };
    var bodyText = "";
    if (result && result.type === "json") {
      bodyText = responseToText(result.body);
    } else {
      bodyText = responseToText(result);
    }
    var headerMap = buildHeaderMap(headers);
    var headerText = Object.keys(headers)
      .map(function (key) {
        return key + ": " + headers[key];
      })
      .join("\r\n");

    window.setTimeout(function () {
      if (xhr.__mockAborted) {
        return;
      }
      setXHRValue(xhr, "readyState", 4);
      setXHRValue(xhr, "status", status);
      setXHRValue(xhr, "statusText", "OK");
      setXHRValue(xhr, "responseURL", xhr.__mockUrl || "");
      setXHRValue(xhr, "responseText", bodyText);
      setXHRValue(xhr, "response", xhr.responseType === "json" ? JSON.parse(bodyText) : bodyText);
      xhr.getAllResponseHeaders = function () {
        return headerText;
      };
      xhr.getResponseHeader = function (name) {
        return headerMap[String(name).toLowerCase()] || null;
      };
      emitXHREvent(xhr, "readystatechange");
      emitXHREvent(xhr, "load");
      emitXHREvent(xhr, "loadend");
    }, 60);
  }

  function makeSSEBody(events) {
    return events.map(function (event) {
      return "data: " + JSON.stringify(event) + "\n\n";
    });
  }

  function shouldMock(pathname) {
    return pathname.indexOf("/pedestal/") === 0 || pathname.indexOf("/aibase/") === 0;
  }

  XMLHttpRequest.prototype.open = function (method, url) {
    var pathname = getPathname(url);
    this.__mockUrl = url;
    this.__mockMethod = method;
    this.__mockHeaders = {};
    this.__isLocalMock = shouldMock(pathname);
    this.__mockPathname = pathname;
    if (this.__isLocalMock) {
      setXHRValue(this, "readyState", 1);
      return;
    }
    return nativeXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this.__isLocalMock) {
      this.__mockHeaders[name] = value;
      return;
    }
    return nativeXHRSetRequestHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!this.__isLocalMock) {
      return nativeXHRSend.apply(this, arguments);
    }
    var request = {
      method: this.__mockMethod || "GET",
      url: this.__mockUrl || "",
      pathname: this.__mockPathname || "",
      searchParams: getSearchParams(this.__mockUrl || ""),
      headers: this.__mockHeaders || {},
      body: parseBody(body, this.__mockHeaders || {}),
    };
    var result = routeMock(request);
    if (!result) {
      emitXHREvent(this, "error");
      return;
    }
    sendMockXHR(this, result);
  };

  XMLHttpRequest.prototype.abort = function () {
    if (this.__isLocalMock) {
      this.__mockAborted = true;
      emitXHREvent(this, "abort");
      emitXHREvent(this, "loadend");
      return;
    }
    return nativeXHRAbort.apply(this, arguments);
  };

  if (nativeFetch) {
    window.fetch = function (input, init) {
      var method = (init && init.method) || "GET";
      var url = typeof input === "string" ? input : input.url;
      var pathname = getPathname(url);
      if (!shouldMock(pathname)) {
        return nativeFetch(input, init);
      }
      var request = {
        method: method,
        url: url,
        pathname: pathname,
        searchParams: getSearchParams(url),
        headers: (init && init.headers) || {},
        body: parseBody(init && init.body, (init && init.headers) || {}),
      };
      var result = routeMock(request);
      if (!result) {
        return Promise.resolve(
          new Response(JSON.stringify({ code: 404, message: "Not mocked" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (result.type === "stream") {
        return Promise.resolve(
          new Response(createTextStream(makeSSEBody(result.body), 160), {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify(result.body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };
  }

  ensureToken();
  window.__AIXG_LOCAL_MOCK__ = {
    loadState: loadState,
    saveState: saveState,
  };
  console.info("[local-mock] 学工超级智能体本地 mock 已启用");
})();
