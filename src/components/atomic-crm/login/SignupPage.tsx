import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useDataProvider, useLogin, useNotify } from "ra-core";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { SignUpData } from "../types";
import { LoginSkeleton } from "./LoginSkeleton";
import { Notification } from "@/components/admin/notification";
import { ConfirmationRequired } from "./ConfirmationRequired";
import { SSOAuthButton } from "./SSOAuthButton";

export const SignupPage = () => {
  const queryClient = useQueryClient();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const { title, googleWorkplaceDomain } = useConfigurationContext();
  const navigate = useNavigate();
  const { data: isInitialized, isPending } = useQuery({
    queryKey: ["init"],
    queryFn: async () => {
      return dataProvider.isInitialized();
    },
  });

  const { isPending: isSignUpPending, mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SignUpData) => {
      return dataProvider.signUp(data);
    },
    onSuccess: (data) => {
      login({
        email: data.email,
        password: data.password,
        redirectTo: "/contacts",
      })
        .then(() => {
          notify("Utente iniziale creato con successo");
          // FIXME: We should probably provide a hook for that in the ra-core package
          queryClient.invalidateQueries({
            queryKey: ["auth", "canAccess"],
          });
        })
        .catch((err) => {
          if (err.code === "email_not_confirmed") {
            // An email confirmation is required to continue.
            navigate(ConfirmationRequired.path);
          } else {
            notify("Accesso fallito.", {
              type: "error",
            });
            navigate("/login");
          }
        });
    },
    onError: (error) => {
      notify(error.message);
    },
  });

  const login = useLogin();
  const notify = useNotify();

  const {
    register,
    handleSubmit,
    formState: { isValid },
  } = useForm<SignUpData>({
    mode: "onChange",
  });

  if (isPending) {
    return <LoginSkeleton />;
  }

  // For the moment, we only allow one user to sign up. Other users must be created by the administrator.
  if (isInitialized) {
    return <Navigate to="/login" />;
  }

  const onSubmit: SubmitHandler<SignUpData> = async (data) => {
    mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="size-24 rounded-full bg-white shadow-md overflow-hidden">
        <img
          src="/android-chrome-512x512.png"
          alt={title}
          className="size-full object-cover"
        />
      </div>
      <div className="w-full max-w-sm flex flex-col gap-4 mt-8">
        <h1 className="text-2xl font-bold">Benvenuto nel Gestionale</h1>
        <p className="text-sm text-muted-foreground">
          Crea il primo account utente per completare la configurazione.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="first_name">Nome</Label>
            <Input
              {...register("first_name", { required: true })}
              id="first_name"
              type="text"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="last_name">Cognome</Label>
            <Input
              {...register("last_name", { required: true })}
              id="last_name"
              type="text"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              {...register("email", { required: true })}
              id="email"
              type="email"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              {...register("password", { required: true })}
              id="password"
              type="password"
              required
            />
          </div>
          <div className="flex flex-col gap-4 items-center mt-8">
            <Button
              type="submit"
              disabled={!isValid || isSignUpPending}
              className="w-full"
            >
              {isSignUpPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creazione...
                </>
              ) : (
                "Crea account"
              )}
            </Button>
            {googleWorkplaceDomain ? (
              <SSOAuthButton className="w-full" domain={googleWorkplaceDomain}>
                Accedi con Google Workplace
              </SSOAuthButton>
            ) : null}
          </div>
        </form>
      </div>
      <Notification />
    </div>
  );
};

SignupPage.path = "/sign-up";
