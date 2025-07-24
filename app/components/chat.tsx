"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";

type Person = {
  name: string;
  email: string;
  phone_number: string; // Changed from phoneNumber to phone_number
  age: number;
  plan_summary: string;
};

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
  isTyping?: boolean; // Add isTyping to MessageProps
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({
  text,
  isTyping,
}: {
  text: string;
  isTyping?: boolean;
}) => {
  const [currentTypingMessageIndex, setCurrentTypingMessageIndex] = useState(0);
  const typingMessages = [
    "Thinking...",
    "Formulating response...",
    "Analyzing data...",
    "Consulting knowledge base...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTyping) {
      interval = setInterval(() => {
        setCurrentTypingMessageIndex(
          (prevIndex) => (prevIndex + 1) % typingMessages.length
        );
      }, 1000); // Change message every 1 second
    }
    return () => clearInterval(interval);
  }, [isTyping, typingMessages.length]);

  // Regex to match the reference pattern like 【4:0†bima_yojana_micro-insurance_part_1.md】.
  // This pattern matches a Chinese opening square bracket, followed by any characters
  // that are not a Chinese closing square bracket, and then the Chinese closing square bracket.
  const cleanedText = text.replace(/【[^】]*】/g, "");

  return (
    <div className={styles.assistantMessage}>
      {isTyping ? (
        <span className={styles.typingIndicator}>
          {typingMessages[currentTypingMessageIndex]}
        </span>
      ) : (
        <Markdown remarkPlugins={[remarkGfm]}>{cleanedText}</Markdown>
      )}
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.codeMessage}>
      {text.split("\n").map((line, index) => (
        <div key={index}>
          <span>{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

const Message = ({ role, text, isTyping }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} isTyping={isTyping} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
};

const Chat = ({ functionCallHandler: propFunctionCallHandler }: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");

  const functionCallHandler = async (call: RequiredActionFunctionToolCall) => {
    if (call?.function?.name === "save_to_google_sheet") {
      console.log("Tool is called ");
      const args: Person = JSON.parse(call.function.arguments);

      let planSummary = "";
      try {
        const summaryResponse = await fetch(
          `/api/assistants/threads/${threadId}/summary`
        );
        const summaryData = await summaryResponse.json();
        planSummary = summaryData.planSummary || "No specific plan discussed";
      } catch (error) {
        console.error("Error fetching plan summary:", error);
        planSummary = "Error fetching plan summary";
      }

      const response = await fetch("/api/google-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: args.name,
          email: args.email,
          phone_number: args.phone_number,
          age: args.age,
          plan_summary: planSummary,
        }),
      });
      const data = await response.json();
      return JSON.stringify(data);
    }
    // If a propFunctionCallHandler is provided, use it, otherwise return an empty string.
    if (propFunctionCallHandler) {
      return propFunctionCallHandler(call);
    }
    return "";
  };

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // create a new threadID when chat component created
  useEffect(() => {
    const createThread = async () => {
      const res = await fetch(`/api/assistants/threads`, {
        method: "POST",
      });
      const data = await res.json();
      setThreadId(data.threadId);
    };
    createThread();
  }, []);

  // Display initial assistant message
  useEffect(() => {
    setMessages((prevMessages) => {
      if (prevMessages.length === 0) {
        return [
          {
            role: "assistant",
            text: "I am PNB MetLife Insurance Plans assistant that can help you with family plans, group insurance plans and rider plans",
          },
        ];
      }
      return prevMessages;
    });
  }, []);

  const sendMessage = async (text) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: text,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const submitActionResult = async (runId, toolCallOutputs) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId,
          toolCallOutputs: toolCallOutputs,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendMessage(userInput);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    // Add a typing indicator for the assistant
    appendMessage("assistant", "", true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    // Remove typing indicator when assistant starts responding
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      if (lastMessage && lastMessage.isTyping) {
        return [
          ...prevMessages.slice(0, -1),
          { ...lastMessage, isTyping: false, text: "" },
        ];
      } else {
        return [...prevMessages, { role: "assistant", text: "" }];
      }
    });
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    }
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  // imageFileDone - show image in chat
  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  };

  // toolCallCreated - log new tool call
  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  // toolCallDelta - log delta and snapshot for the tool call
  const toolCallDelta = (delta, snapshot) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    // loop over tool calls and call function handler
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await functionCallHandler(toolCall);
        //         appendMessage(
        //           "code",
        //           `Tool Call: ${toolCall.function.name}(
        // ${toolCall.function.arguments}
        // )
        // Result: ${result}`
        //         );
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    // messages
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);

    // image
    stream.on("imageFileDone", handleImageFileDone);

    // code interpreter
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    // events without helpers yet (e.g. requires_action and run.done)
    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

  const appendToLastMessage = (text) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role, text, isTyping = false) => {
    setMessages((prevMessages) => [...prevMessages, { role, text, isTyping }]);
  };

  const annotateLastMessage = (annotations) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === "file_path") {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      });
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message
            key={index}
            role={msg.role}
            text={msg.text}
            isTyping={msg.isTyping}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className={`${styles.inputForm} ${styles.clearfix}`}
      >
        <input
          type="text"
          className={styles.input}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your question"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={inputDisabled}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
