import { useState, type FormEvent } from "react";
import {
  AlertCircleIcon,
  CircleCheckIcon,
  EyeIcon,
  EyeOffIcon,
  MailCheckIcon,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@lifeos/ui/components/alert";
import { Button } from "@lifeos/ui/components/button";
import { Checkbox } from "@lifeos/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@lifeos/ui/components/field";
import { Input } from "@lifeos/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@lifeos/ui/components/input-group";
import { Spinner } from "@lifeos/ui/components/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lifeos/ui/components/tabs";

import { LifeOsMark } from "@/components/lifeos-mark";
import { authClient } from "@/lib/auth-client";

type RouteMode = "sign-in" | "sign-up" | "forgot" | "reset";
type FormField = "name" | "email" | "password" | "terms" | "form";
type FormErrors = Partial<Record<FormField, string | undefined>>;
type Completion =
  | { kind: "account"; email: string }
  | { kind: "reset-sent"; email: string }
  | { kind: "password-reset" };

type AuthError = {
  code?: string | undefined;
  message?: string | undefined;
  status?: number | undefined;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inputClassName =
  "h-14 rounded-xl bg-background/30 px-4 text-base shadow-none";

function getRouteMode(pathname: string): RouteMode {
  if (pathname === "/signup") {
    return "sign-up";
  }

  if (pathname === "/forgot-password") {
    return "forgot";
  }

  if (pathname === "/reset-password") {
    return "reset";
  }

  return "sign-in";
}

function getAuthErrorMessage(error: AuthError | null, fallback: string) {
  const message = error?.message?.toLowerCase() ?? "";

  if (
    error?.status === 0 ||
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return "LifeOS couldn’t reach the server. Check that the API and database are running, then try again.";
  }

  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return "That email or password doesn’t match.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirm your email before signing in.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 8 characters for your password.";
    case "PASSWORD_TOO_LONG":
      return "Use no more than 128 characters for your password.";
    case "INVALID_TOKEN":
      return "This reset link is invalid or has expired.";
    default:
      return fallback;
  }
}

function FormFeedback({ message }: { message?: string | undefined }) {
  if (!message) {
    return null;
  }

  return (
    <Alert
      variant="destructive"
      className="animate-in border-destructive/25 bg-destructive/8 px-3 py-3 fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
    >
      <AlertCircleIcon aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function validateEmail(email: string) {
  if (!email.trim()) {
    return "Enter your email address.";
  }

  if (!emailPattern.test(email)) {
    return "Enter a valid email address.";
  }

  return undefined;
}

function AuthBrand() {
  return (
    <a
      href="/"
      className="inline-flex items-center gap-4 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label="LifeOS home"
    >
      <LifeOsMark />
      <span className="text-xl tracking-[0.08em] text-muted-foreground">
        LifeOS
      </span>
    </a>
  );
}

function AuthArtwork() {
  return (
    <aside className="relative hidden min-h-dvh overflow-hidden bg-background lg:block">
      <img
        src="/images/auth-me-portrait.png"
        alt=""
        className="absolute inset-0 size-full origin-top scale-[1.14] object-cover object-[48%_25%]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-background/10 via-transparent to-background"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20"
        aria-hidden
      />

      <div className="absolute top-10 left-10">
        <AuthBrand />
      </div>

      <div className="absolute right-10 bottom-[7.5rem] left-[clamp(3rem,10vw,9rem)] max-w-[31rem]">
        <p className="text-[clamp(2.45rem,3.7vw,3.5rem)] leading-[1.12] font-medium tracking-[-0.035em] text-foreground">
          One place for the
          <br />
          life you’re building.
        </p>
        <p className="mt-5 text-xl text-muted-foreground">
          Private by design. Yours to shape.
        </p>
      </div>
    </aside>
  );
}

function MobileArtwork() {
  return (
    <div className="relative h-48 overflow-hidden border-b border-border/50 lg:hidden">
      <img
        src="/images/auth-me-portrait.png"
        alt=""
        className="absolute inset-0 size-full object-cover object-[50%_28%] opacity-75"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-background/30"
        aria-hidden
      />
      <div className="absolute top-6 left-5 sm:left-8">
        <AuthBrand />
      </div>
      <p className="absolute right-5 bottom-5 left-5 text-lg font-medium tracking-[-0.01em] sm:left-8">
        Private by design. Yours to shape.
      </p>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  autoComplete: "current-password" | "new-password";
  description?: string | undefined;
  className?: string | undefined;
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  description,
  className,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Field data-invalid={Boolean(error)} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className="h-14 rounded-xl bg-background/30">
        <InputGroupInput
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className="px-4 text-base"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            size="icon-sm"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-[2rem] leading-tight font-medium tracking-[-0.025em]">
        {title}
      </h1>
      <p className="text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {
      email: validateEmail(email),
      password: password ? undefined : "Enter your password.",
    };

    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: true,
      });

      if (error) {
        setErrors({
          form: getAuthErrorMessage(
            error,
            "We couldn’t sign you in. Check your details and try again.",
          ),
        });
        return;
      }

      const returnTo =
        typeof location.state?.from === "string" &&
        location.state.from.startsWith("/")
          ? location.state.from
          : "/";

      toast.success("Welcome back.");
      navigate(returnTo, { replace: true });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <AuthHeading
        title="Welcome back."
        description="Your space is ready when you are."
      />

      <form noValidate onSubmit={handleSubmit}>
        <FieldGroup className="gap-6">
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
            <Input
              id="sign-in-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({
                  ...current,
                  email: undefined,
                  form: undefined,
                }));
              }}
              aria-invalid={Boolean(errors.email)}
              className={inputClassName}
            />
            <FieldError>{errors.email}</FieldError>
          </Field>

          <PasswordField
            id="sign-in-password"
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setErrors((current) => ({
                ...current,
                password: undefined,
                form: undefined,
              }));
            }}
            error={errors.password}
            autoComplete="current-password"
            className="mt-4"
          />

          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto self-end px-0 font-normal text-muted-foreground underline underline-offset-4"
            onClick={() =>
              navigate("/forgot-password", { state: location.state })
            }
          >
            Forgot password?
          </Button>

          <FormFeedback message={errors.form} />

          <Button
            type="submit"
            size="lg"
            className="mt-4 h-16 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner data-icon="inline-start" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="-mt-8 text-center text-sm text-muted-foreground">
        New to LifeOS?{" "}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-sm font-normal underline underline-offset-4"
          onClick={() => navigate("/signup", { state: location.state })}
        >
          Create account
        </Button>
      </p>
    </div>
  );
}

function SignUpForm({
  onComplete,
}: {
  onComplete: (completion: Completion) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {
      name: name.trim() ? undefined : "Enter your name.",
      email: validateEmail(email),
      password: password.length >= 8 ? undefined : "Use at least 8 characters.",
      terms: termsAccepted ? undefined : "Accept the terms to continue.",
    };

    setErrors(nextErrors);

    if (
      nextErrors.name ||
      nextErrors.email ||
      nextErrors.password ||
      nextErrors.terms
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await authClient.signUp.email({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrors({
          form: getAuthErrorMessage(
            error,
            "We couldn’t create your account. Review your details and try again.",
          ),
        });
        return;
      }

      onComplete({ kind: "account", email: normalizedEmail });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-9">
      <AuthHeading
        title="Create your space."
        description="A calm place for everything that matters."
      />

      <form noValidate onSubmit={handleSubmit}>
        <FieldGroup className="gap-5">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="sign-up-name">Name</FieldLabel>
            <Input
              id="sign-up-name"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Your name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((current) => ({
                  ...current,
                  name: undefined,
                  form: undefined,
                }));
              }}
              aria-invalid={Boolean(errors.name)}
              className={inputClassName}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
            <Input
              id="sign-up-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({
                  ...current,
                  email: undefined,
                  form: undefined,
                }));
              }}
              aria-invalid={Boolean(errors.email)}
              className={inputClassName}
            />
            <FieldError>{errors.email}</FieldError>
          </Field>

          <PasswordField
            id="sign-up-password"
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setErrors((current) => ({
                ...current,
                password: undefined,
                form: undefined,
              }));
            }}
            error={errors.password}
            autoComplete="new-password"
            description="Use at least 8 characters."
          />

          <Field
            orientation="horizontal"
            data-invalid={Boolean(errors.terms)}
            className="items-start"
          >
            <Checkbox
              id="sign-up-terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => {
                setTermsAccepted(checked === true);
                setErrors((current) => ({
                  ...current,
                  terms: undefined,
                  form: undefined,
                }));
              }}
              aria-invalid={Boolean(errors.terms)}
            />
            <FieldContent>
              <FieldLabel
                htmlFor="sign-up-terms"
                className="text-sm font-normal text-muted-foreground"
              >
                I agree to the Terms and Privacy Policy.
              </FieldLabel>
              <FieldError>{errors.terms}</FieldError>
            </FieldContent>
          </Field>

          <FormFeedback message={errors.form} />

          <Button
            type="submit"
            size="lg"
            className="mt-1 h-14 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner data-icon="inline-start" />
                Creating your space…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}

function ForgotPasswordForm({
  onComplete,
}: {
  onComplete: (completion: Completion) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextError = validateEmail(email);
    setError(nextError);

    if (nextError) {
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error: requestError } = await authClient.requestPasswordReset({
        email: normalizedEmail,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (requestError) {
        setFormError(
          getAuthErrorMessage(
            requestError,
            "We couldn’t start the reset. Wait a moment and try again.",
          ),
        );
        return;
      }

      onComplete({ kind: "reset-sent", email: normalizedEmail });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <AuthHeading
        title="Reset your password."
        description="We’ll send a secure reset link to your email."
      />

      <form noValidate onSubmit={handleSubmit}>
        <FieldGroup className="gap-6">
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="reset-email">Email</FieldLabel>
            <Input
              id="reset-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(undefined);
                setFormError(undefined);
              }}
              aria-invalid={Boolean(error)}
              className={inputClassName}
            />
            <FieldError>{error}</FieldError>
          </Field>

          <FormFeedback message={formError} />

          <Button
            type="submit"
            size="lg"
            className="mt-2 h-14 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner data-icon="inline-start" />
                Sending link…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </FieldGroup>
      </form>

      <Button
        type="button"
        variant="link"
        size="sm"
        className="mx-auto h-auto px-0 text-muted-foreground"
        onClick={() => navigate("/login", { state: location.state })}
      >
        Back to sign in
      </Button>
    </div>
  );
}

function ResetPasswordForm({
  onComplete,
}: {
  onComplete: (completion: Completion) => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<{
    password?: string | undefined;
    confirmation?: string | undefined;
    form?: string | undefined;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  if (!token || linkError) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex size-12 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
          <AlertCircleIcon className="size-5" aria-hidden />
        </div>
        <AuthHeading
          title="This link has expired."
          description="Request a new password reset link and we’ll get you back in."
        />
        <Button
          type="button"
          size="lg"
          className="h-14 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
          onClick={() => navigate("/forgot-password")}
        >
          Request a new link
        </Button>
      </div>
    );
  }

  const resetToken = token;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = {
      password: password.length >= 8 ? undefined : "Use at least 8 characters.",
      confirmation:
        confirmation === password ? undefined : "The passwords don’t match.",
    };

    setErrors(nextErrors);

    if (nextErrors.password || nextErrors.confirmation) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token: resetToken,
      });

      if (error) {
        setErrors({
          form: getAuthErrorMessage(
            error,
            "We couldn’t update your password. Request a new link and try again.",
          ),
        });
        return;
      }

      onComplete({ kind: "password-reset" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <AuthHeading
        title="Choose a new password."
        description="Make it memorable, private, and at least 8 characters."
      />

      <form noValidate onSubmit={handleSubmit}>
        <FieldGroup className="gap-6">
          <PasswordField
            id="reset-password"
            label="New password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setErrors((current) => ({
                ...current,
                password: undefined,
                form: undefined,
              }));
            }}
            error={errors.password}
            autoComplete="new-password"
          />

          <PasswordField
            id="reset-password-confirmation"
            label="Confirm password"
            value={confirmation}
            onChange={(value) => {
              setConfirmation(value);
              setErrors((current) => ({
                ...current,
                confirmation: undefined,
                form: undefined,
              }));
            }}
            error={errors.confirmation}
            autoComplete="new-password"
          />

          <FormFeedback message={errors.form} />

          <Button
            type="submit"
            size="lg"
            className="mt-1 h-14 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner data-icon="inline-start" />
                Updating password…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}

function AuthCompletion({
  completion,
  onBack,
}: {
  completion: Completion;
  onBack: () => void;
}) {
  const isAccountCreated = completion.kind === "account";
  const isPasswordReset = completion.kind === "password-reset";

  return (
    <div className="flex flex-col items-start gap-8">
      <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40">
        {isAccountCreated || isPasswordReset ? (
          <CircleCheckIcon className="size-5" aria-hidden />
        ) : (
          <MailCheckIcon className="size-5" aria-hidden />
        )}
      </div>
      <AuthHeading
        title={
          isAccountCreated
            ? "Your space is ready."
            : isPasswordReset
              ? "Password updated."
              : "Check your inbox."
        }
        description={
          isAccountCreated
            ? `Your account was created for ${completion.email}. You can sign in and start shaping your LifeOS.`
            : isPasswordReset
              ? "Your new password is set. You can sign in now."
              : `If an account exists for ${completion.email}, password reset instructions are on their way.`
        }
      />
      {completion.kind === "reset-sent" ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Didn’t receive it? Check your spam folder or try again in a moment.
        </p>
      ) : isAccountCreated ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          You can sign in now. Family invitations appear inside LifeOS when
          someone invites your account.
        </p>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="h-14 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
        onClick={onBack}
      >
        Continue to sign in
      </Button>
    </div>
  );
}

function HelpLink() {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="mx-auto mt-16 h-auto px-0 font-normal text-muted-foreground underline underline-offset-4"
      onClick={() => toast("LifeOS help is ready when you need it.")}
    >
      Help
    </Button>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeMode = getRouteMode(location.pathname);
  const tabValue = routeMode === "sign-up" ? "sign-up" : "sign-in";
  const [completion, setCompletion] = useState<Completion>();

  function handleTabChange(value: string) {
    setCompletion(undefined);
    navigate(value === "sign-up" ? "/signup" : "/login", {
      state: location.state,
    });
  }

  function backToSignIn() {
    setCompletion(undefined);
    navigate("/login", { state: location.state });
  }

  return (
    <main className="dark min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-2">
        <AuthArtwork />

        <section
          className="flex min-h-dvh min-w-0 flex-col bg-background"
          aria-label="LifeOS account access"
        >
          <MobileArtwork />

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:items-start lg:px-16 lg:pt-[clamp(4rem,11.5vh,7rem)] lg:pb-12">
            <Tabs
              value={tabValue}
              onValueChange={handleTabChange}
              className="w-full max-w-[23.25rem] gap-0 lg:-translate-x-6"
            >
              <TabsList className="w-full border border-border bg-muted/30 p-1 group-data-horizontal/tabs:h-12">
                <TabsTrigger value="sign-in" className="h-full">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="sign-up" className="h-full">
                  Create account
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="sign-in"
                className="mt-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none lg:mt-20"
              >
                {completion ? (
                  <AuthCompletion
                    completion={completion}
                    onBack={backToSignIn}
                  />
                ) : routeMode === "forgot" ? (
                  <ForgotPasswordForm onComplete={setCompletion} />
                ) : routeMode === "reset" ? (
                  <ResetPasswordForm onComplete={setCompletion} />
                ) : (
                  <SignInForm />
                )}
                <HelpLink />
              </TabsContent>

              <TabsContent
                value="sign-up"
                className="mt-9 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none lg:mt-12"
              >
                {completion ? (
                  <AuthCompletion
                    completion={completion}
                    onBack={backToSignIn}
                  />
                ) : (
                  <SignUpForm onComplete={setCompletion} />
                )}
                <HelpLink />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </main>
  );
}
