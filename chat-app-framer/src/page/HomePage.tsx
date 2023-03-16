import React, { useEffect, useState } from "react";
import { Button, Sidebar, TextInput } from "flowbite-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import axios, { AxiosRequestConfig } from "axios";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { HubConnection } from "@microsoft/signalr/dist/esm/HubConnection";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

const liAnimation = {
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 },
    },
  },
  hidden: {
    y: 50,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 },
    },
  },
};

const listAnimation = {
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
  hidden: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const leftChatBubbleAnimation = {
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  hidden: {
    opacity: 0,
    x: -50,
    transition: {
      x: { stiffness: 1000 },
    },
  },
};

const rightChatBubbleAnimation = {
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  hidden: {
    opacity: 0,
    x: 50,
    transition: {
      x: { stiffness: 1000 },
    },
  },
};

const opacityAnimation = {
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
};

interface UserResponse {
  id: string;
  username: string;
}

interface MeResponse {
  userId: string;
}

interface MessageResponse {
  id: string;
  userId: string;
  content: string;
}

type FormValues = {
  message: string;
};

enum MessageType {
  LEFT,
  RIGHT,
}

type Message = {
  id: string;
  content: string;
  type: MessageType;
};

export const HomePage = () => {
  const navigate = useNavigate();

  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [meId, setMeId] = useState<string>();
  const [usersJustMessageMeId, setUsersJustMessageMeId] = useState<string[]>(
    []
  );
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [connectionStarted, setConnectionStarted] = useState<boolean>(false);

  const [connection, setConnection] = useState<HubConnection>();

  const protectedQuery = useQuery("protected", async () => {
    const token = localStorage.getItem("token");
    const config: AxiosRequestConfig<any> = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const { data } = await axios.get<MeResponse>(
      "https://localhost:7170/api/auth/protected",
      config
    );

    return data;
  });

  const allUsersQuery = useQuery("users", async () => {
    const token = localStorage.getItem("token");
    const config: AxiosRequestConfig<any> = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const { data } = await axios.get<UserResponse[]>(
      "https://localhost:7170/api/chat/users",
      config
    );

    return data;
  });

  const messagesQuery = useQuery(
    ["messages", selectedUserId],
    async ({ queryKey }) => {
      const [_, selectedUserId] = queryKey;

      const token = localStorage.getItem("token");
      const config: AxiosRequestConfig<any> = {
        params: { receiverId: selectedUserId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const { data } = await axios.get<MessageResponse[]>(
        "http://localhost:5282/api/chat/messages",
        config
      );

      return data;
    },
    {
      enabled: false,
    }
  );

  useEffect(() => {
    if (protectedQuery.isSuccess) {
      setMeId(protectedQuery.data.userId);
    }
  }, [protectedQuery.isSuccess]);

  useEffect(() => {
    if (protectedQuery.isError) {
      navigate("/login");
    }
  }, [protectedQuery.isError]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && token !== "") {
      const connect = new HubConnectionBuilder()
        .withUrl("https://localhost:7170/chathub", {
          accessTokenFactory: () => `${token}`,
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect()
        .build();

      setConnection(connect);
    }
  }, []);

  useEffect(() => {
    if (connection && meId) {
      connection.start().then(() => {
        connection.invoke("JoinChat");

        setConnectionStarted(true);
      });
    }
  }, [connection, meId]);

  useEffect(() => {
    if (connection && connectionStarted && meId) {
      connection.on("ReceiveMessage", (senderId, messageId, messageContent) => {
        console.log(meId, senderId, messageId, messageContent);
        console.log(meId === senderId);

        const newMessages = { ...messages };
        if (senderId === meId) {
          console.log(newMessages[senderId]);
          if (newMessages[senderId]) {
            newMessages[senderId].unshift({
              id: messageId,
              content: messageContent,
              type: MessageType.RIGHT,
            });
          } else {
            newMessages[senderId] = [
              {
                id: messageId,
                content: messageContent,
                type: MessageType.RIGHT,
              },
            ];
          }

          setMessages(newMessages);
        } else {
          if (newMessages[senderId]) {
            newMessages[senderId].unshift({
              id: messageId,
              content: messageContent,
              type: MessageType.LEFT,
            });
          } else {
            newMessages[senderId] = [
              {
                id: messageId,
                content: messageContent,
                type: MessageType.LEFT,
              },
            ];
          }

          setMessages(newMessages);
        }

        setUsersJustMessageMeId([...usersJustMessageMeId, senderId]);
      });
    }

    return () => connection?.off("ReceiveMessage");
  }, [connection, connectionStarted, meId, messages]);

  useEffect(() => {
    if (selectedUserId) {
      messagesQuery.refetch();
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId && messagesQuery.isSuccess) {
      const chatMessages: Message[] = [];

      messagesQuery.data.map((messageResponse) => {
        chatMessages.push({
          id: messageResponse.id,
          content: messageResponse.content,
          type:
            messageResponse.userId === meId
              ? MessageType.RIGHT
              : MessageType.LEFT,
        });
      });

      const newMessages = { ...messages };
      newMessages[selectedUserId] = chatMessages;

      setMessages(newMessages);
    }
  }, [messagesQuery.isSuccess]);

  const { register, handleSubmit, reset } = useForm<FormValues>();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const groupChatsSkeleton = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="w-screen h-screen flex flex-wrap items-center justify-center">
      <Sidebar className="z-10">
        <Sidebar.Items>
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={listAnimation}
          >
            <Sidebar.ItemGroup>
              <p className="font-bold ml-4">Users</p>
            </Sidebar.ItemGroup>
            <Sidebar.ItemGroup>
              {allUsersQuery.isLoading &&
                groupChatsSkeleton.map((_, index) => {
                  return (
                    <motion.div key={index} variants={liAnimation}>
                      <motion.div className="h-10 w-full bg-gray-200 rounded-lg dark:bg-gray-700 mb-4 animate-pulse"></motion.div>
                    </motion.div>
                  );
                })}
              {allUsersQuery.isSuccess &&
                allUsersQuery.data?.map((user) => {
                  return (
                    <motion.div
                      key={user.id}
                      variants={liAnimation}
                      onClick={() => {
                        setSelectedUserId(user.id);

                        setUsersJustMessageMeId(
                          usersJustMessageMeId.filter(
                            (userJustMessageMeId) =>
                              userJustMessageMeId !== user.id
                          )
                        );
                      }}
                    >
                      <Sidebar.Item
                        href="#"
                        className={
                          user.id === selectedUserId ? "bg-gray-100" : null
                        }
                        label={
                          usersJustMessageMeId.indexOf(user.id) !== -1
                            ? "New"
                            : null
                        }
                        labelColor="alternative"
                      >
                        {user.username}
                      </Sidebar.Item>
                    </motion.div>
                  );
                })}
            </Sidebar.ItemGroup>
          </motion.ul>
        </Sidebar.Items>
      </Sidebar>
      <div className="flex-1 flex flex-wrap w-full h-full max-h-min">
        <div className="flex flex-col w-full h-full">
          <div className="w-full">
            <nav className="flex flex-row gap-4 bg-white border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800 drop-shadow-sm">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={opacityAnimation}
                className="h-10 flex-1 bg-gray-200 rounded-lg dark:bg-gray-700 animate-pulse"
              ></motion.div>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={opacityAnimation}
              >
                <Button
                  onClick={() => {
                    handleLogout();
                  }}
                >
                  Logout
                </Button>
              </motion.div>
            </nav>
          </div>
          <div className="flex-1 h-full w-full">
            <motion.div
              className="flex flex-col-reverse gap-2 p-4 h-full overflow-scroll overflow-x-hidden"
              style={{ maxHeight: "calc(100vh - 140px)" }}
              initial="hidden"
              animate="visible"
              variants={listAnimation}
            >
              <>
                {selectedUserId &&
                  messages[selectedUserId]?.map((message) => {
                    return (
                      <motion.div
                        key={message.id}
                        variants={
                          message.type === MessageType.LEFT
                            ? leftChatBubbleAnimation
                            : rightChatBubbleAnimation
                        }
                        className={`rounded-full bg-gray-100 pl-5 pr-5 px-2 py-2 ${
                          message.type === MessageType.RIGHT
                            ? "ml-auto"
                            : "mr-auto"
                        }`}
                      >
                        {message.content}
                      </motion.div>
                    );
                  })}
                {messagesQuery.isLoading ? (
                  <>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={leftChatBubbleAnimation}
                        className="w-96 h-10 bg-gray-200 rounded-full dark:bg-gray-700 animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={leftChatBubbleAnimation}
                        className="w-40 h-10 bg-gray-200 rounded-full dark:bg-gray-700 animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={rightChatBubbleAnimation}
                        className="w-40 h-10 bg-gray-200 rounded-full dark:bg-gray-700 ml-auto animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={rightChatBubbleAnimation}
                        className="w-80 h-10 bg-gray-200 rounded-full dark:bg-gray-700 ml-auto animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={leftChatBubbleAnimation}
                        className="w-80 h-10 bg-gray-200 rounded-full dark:bg-gray-700 animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={leftChatBubbleAnimation}
                        className="w-80 h-10 bg-gray-200 rounded-full dark:bg-gray-700 animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={rightChatBubbleAnimation}
                        className="w-80 h-10 bg-gray-200 rounded-full dark:bg-gray-700 ml-auto animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={leftChatBubbleAnimation}
                        className="w-40 h-10 bg-gray-200 rounded-full dark:bg-gray-700 animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={leftChatBubbleAnimation}
                        className="w-40 h-10 bg-gray-200 rounded-full dark:bg-gray-700 animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={leftChatBubbleAnimation}
                        className="w-40 h-10 bg-gray-200 rounded-full dark:bg-gray-700 ml-auto animate-pulse"
                      ></motion.div>
                    </div>
                    <div className="w-full max-h-min">
                      <motion.div
                        variants={leftChatBubbleAnimation}
                        className="w-96 h-10 bg-gray-200 rounded-full dark:bg-gray-700 animate-pulse"
                      ></motion.div>
                    </div>
                  </>
                ) : null}
              </>
            </motion.div>
          </div>
          <div className="w-full">
            <form
              className="flex flex-wrap p-4 gap-4"
              onSubmit={handleSubmit((data) => {
                if (data.message !== "") {
                  if (connection) {
                    connection.invoke(
                      "SendMessage",
                      selectedUserId,
                      data.message
                    );

                    if (selectedUserId) {
                      const newMessages = { ...messages };
                      if (newMessages[selectedUserId]) {
                        newMessages[selectedUserId].unshift({
                          id: uuidv4(),
                          content: data.message,
                          type: MessageType.RIGHT,
                        });
                      } else {
                        newMessages[selectedUserId] = [
                          {
                            id: uuidv4(),
                            content: data.message,
                            type: MessageType.RIGHT,
                          },
                        ];
                      }

                      setMessages(newMessages);
                    }

                    reset();
                  }
                }
              })}
            >
              <div className="flex-grow">
                <TextInput
                  placeholder="Your message here..."
                  disabled={!selectedUserId}
                  {...register("message")}
                />
              </div>
              <div>
                <Button type="submit" disabled={!selectedUserId}>
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
