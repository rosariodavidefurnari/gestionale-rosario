import { useTheme } from "@/components/admin/use-theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Briefcase,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  ListTodo,
  LogOut,
  Moon,
  Plus,
  Receipt,
  Settings,
  Smartphone,
  Sun,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { Translate, useAuthProvider, useGetIdentity, useLogout } from "ra-core";
import {
  Link,
  matchPath,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router";
import { TaskCreateSheet } from "../tasks/TaskCreateSheet";
import { useState } from "react";

export const MobileNavigation = () => {
  const location = useLocation();

  let currentPath: string | boolean = "/";
  if (matchPath("/", location.pathname)) {
    currentPath = "/";
  } else if (matchPath("/clients/*", location.pathname)) {
    currentPath = "/clients";
  } else if (matchPath("/client_tasks/*", location.pathname)) {
    currentPath = "/client_tasks";
  } else {
    currentPath = false;
  }

  // Check if the app is running as a PWA (standalone mode)
  const isPwa = window.matchMedia("(display-mode: standalone)").matches;
  // Check if it's iOS on the web
  const isWebiOS = /iPad|iPod|iPhone/.test(window.navigator.userAgent);

  return (
    <nav
      aria-label="Navigazione CRM"
      className="fixed bottom-0 left-0 right-0 z-50 bg-secondary h-14"
      style={{
        paddingBottom: isPwa && isWebiOS ? 15 : undefined,
        height:
          "calc(var(--spacing)) * 6" + (isPwa && isWebiOS ? " + 15px" : ""),
      }}
    >
      <div className="flex justify-center">
        <>
          <NavigationButton
            href="/"
            Icon={Home}
            label="Inizio"
            isActive={currentPath === "/"}
          />
          <NavigationButton
            href="/clients"
            Icon={Users}
            label="Clienti"
            isActive={currentPath === "/clients"}
          />
          <CreateButton />
          <NavigationButton
            href="/client_tasks"
            Icon={ListTodo}
            label="Promemoria"
            isActive={currentPath === "/client_tasks"}
          />
          <SettingsButton />
        </>
      </div>
    </nav>
  );
};

const NavigationButton = ({
  href,
  Icon,
  label,
  isActive,
}: {
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
}) => (
  <Button
    asChild
    variant="ghost"
    className={cn(
      "flex-col gap-1 h-auto py-2 px-1 rounded-md w-16",
      isActive ? null : "text-muted-foreground",
    )}
  >
    <Link to={href}>
      <Icon className="size-6" />
      <span className="text-[0.6rem] font-medium">{label}</span>
    </Link>
  </Button>
);

const CreateButton = () => {
  const client_id = useMatch("/clients/:id/*")?.params.id;
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <TaskCreateSheet
        open={taskCreateOpen}
        onOpenChange={setTaskCreateOpen}
        client_id={client_id}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="h-16 w-16 rounded-full -mt-3"
            aria-label="Crea"
          >
            <Plus className="size-10" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => navigate("/expenses/create")}
          >
            Spesa
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => navigate("/services/create")}
          >
            Lavoro
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => navigate("/payments/create")}
          >
            Pagamento
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => {
              setTaskCreateOpen(true);
            }}
          >
            Promemoria
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

const SettingsButton = () => {
  const authProvider = useAuthProvider();
  const { data: identity } = useGetIdentity();
  const logout = useLogout();
  if (!authProvider) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex-col gap-1 h-auto py-2 px-1 rounded-md w-16 text-muted-foreground"
        >
          <Settings className="size-6" />
          <span className="text-[0.6rem] font-medium">Altro</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal h-12 px-4">
          <div className="flex items-center gap-3 h-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={identity?.avatar} role="presentation" />
              <AvatarFallback>{identity?.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="text-base font-medium leading-none">
              {identity?.fullName}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="h-12 px-4 text-base">
          <Link to="/projects">
            <FolderOpen className="size-5" />
            Progetti
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-12 px-4 text-base">
          <Link to="/services">
            <Briefcase className="size-5" />
            Registro Lavori
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-12 px-4 text-base">
          <Link to="/quotes">
            <FileText className="size-5" />
            Preventivi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-12 px-4 text-base">
          <Link to="/payments">
            <CreditCard className="size-5" />
            Pagamenti
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-12 px-4 text-base">
          <Link to="/expenses">
            <Receipt className="size-5" />
            Spese
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="h-12 px-4 text-base">
          <Link to="/profile">
            <User className="size-5" />
            Profilo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-12 px-4 text-base">
          <Link to="/settings">
            <Wrench className="size-5" />
            Impostazioni
          </Link>
        </DropdownMenuItem>
        <ThemeMenu />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="cursor-pointer h-12 px-4 text-base"
        >
          <LogOut />
          <Translate i18nKey="ra.auth.logout">Log out</Translate>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ThemeMenu = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div className="px-3 py-2">
      <ToggleGroup
        type="single"
        value={theme}
        onValueChange={(value) =>
          value && setTheme(value as "light" | "dark" | "system")
        }
        className="justify-start"
        size="lg"
        variant="outline"
      >
        <ToggleGroupItem
          value="system"
          aria-label="Tema di sistema"
          className="px-3"
        >
          <Smartphone className="size-5 mx-2" />
          <span className="sr-only">Sistema</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="light"
          aria-label="Tema chiaro"
          className="px-3"
        >
          <Sun className="size-5 mx-2" />
          <span className="sr-only">Chiaro</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" aria-label="Tema scuro" className="px-3">
          <Moon className="size-5 mx-2" />
          <span className="sr-only">Scuro</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
