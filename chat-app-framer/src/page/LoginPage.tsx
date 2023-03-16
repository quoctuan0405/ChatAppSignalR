import { Button, Card, Label, TextInput } from "flowbite-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "react-query";
import axios from "axios";
import { useEffect } from "react";

const inputAnimation = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const buttonAnimation = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const imgAnimation = {
  hidden: { x: -200, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
  },
};

const opacityAnimation = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

type FormValues = {
  username: string;
  password: string;
};

type LoginResponse = {
  token: string;
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const mutation = useMutation(async (formValue: FormValues) => {
    const { data } = await axios.post<LoginResponse>(
      "https://localhost:7170/api/auth/login",
      formValue
    );

    return data;
  });

  const { register, handleSubmit } = useForm<FormValues>();

  useEffect(() => {
    if (mutation.isSuccess) {
      localStorage.setItem("token", mutation.data.token);

      navigate("/home");
    }
  }, [mutation.isSuccess]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="container h-full px-6 py-24">
        <div className="g-6 flex h-full flex-wrap items-center justify-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={imgAnimation}
            transition={{
              duration: 0.4,
            }}
            className="mb-12 md:mb-0 md:w-8/12 lg:w-6/12"
          >
            <img
              src="https://tecdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.svg"
              className="w-full"
              alt="Phone image"
            />
          </motion.div>
          <motion.div
            className="md:w-8/12 lg:ml-6 lg:w-5/12 max-w-md"
            initial="hidden"
            animate="visible"
            variants={opacityAnimation}
          >
            <Card>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={opacityAnimation}
              >
                <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 text-center">
                  Login
                </h5>
              </motion.div>
              <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit((data) => {
                  mutation.mutate(data);
                })}
              >
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={inputAnimation}
                >
                  <TextInput
                    type="username"
                    placeholder="Username"
                    required={true}
                    disabled={mutation.isLoading}
                    {...register("username")}
                  />
                </motion.div>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={inputAnimation}
                >
                  <TextInput
                    type="password"
                    placeholder="Password"
                    required={true}
                    disabled={mutation.isLoading}
                    {...register("password")}
                  />
                </motion.div>
                <motion.div
                  initial="hidden"
                  animate={mutation.isError ? "visible" : "hidden"}
                  variants={inputAnimation}
                >
                  <p className="ml-auto font-medium text-red-600">
                    Invalid credentials
                  </p>
                </motion.div>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={opacityAnimation}
                >
                  <p className="font-medium">
                    Don't have an account?{" "}
                    <span className="text-blue-600 dark:text-blue-500 hover:underline">
                      <Link to="/signup">Signup</Link>
                    </span>
                  </p>
                </motion.div>
                <motion.div
                  className="h-full w-full"
                  initial="hidden"
                  animate="visible"
                  variants={buttonAnimation}
                >
                  <Button
                    className="h-full w-full"
                    type="submit"
                    disabled={mutation.isLoading}
                  >
                    Login
                  </Button>
                </motion.div>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
