class ChatHistoryManager {
  constructor(workspaceName, projectName) {
    this.LOCAL_STORAGE_KEY = `TwylaWidgetChatHistory_${workspaceName}_${projectName}`;
  }

  get() {
    const history = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    let parsedHistory;

    try {
      parsedHistory = JSON.parse(history);
    } catch {
      this.clean();
      return [];
    }

    if (!Array.isArray(parsedHistory)) {
      this.clean();
      return [];
    }

    return parsedHistory;
  }

  set(value) {
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(value));
  }

  clean() {
    this.set([]);
  }

  push(value) {
    const history = this.get();
    history.push(value);
    this.set(history);
  }
}

export default ChatHistoryManager;
