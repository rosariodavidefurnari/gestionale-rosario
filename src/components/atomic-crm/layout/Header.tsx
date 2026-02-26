import { Settings, User } from "lucide-react";
import { CanAccess, useUserMenu } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";
import { RefreshButton } from "@/components/admin/refresh-button";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { UserMenu } from "@/components/admin/user-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { useConfigurationContext } from "../root/ConfigurationContext";

const Header = () => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const location = useLocation();

  let currentPath: string | boolean = "/";
  if (matchPath("/", location.pathname)) {
    currentPath = "/";
  } else if (matchPath("/clients/*", location.pathname)) {
    currentPath = "/clients";
  } else if (matchPath("/projects/*", location.pathname)) {
    currentPath = "/projects";
  } else if (matchPath("/services/*", location.pathname)) {
    currentPath = "/services";
  } else if (matchPath("/quotes/*", location.pathname)) {
    currentPath = "/quotes";
  } else if (matchPath("/payments/*", location.pathname)) {
    currentPath = "/payments";
  } else if (matchPath("/expenses/*", location.pathname)) {
    currentPath = "/expenses";
  } else if (matchPath("/client_tasks/*", location.pathname)) {
    currentPath = "/client_tasks";
  } else {
    currentPath = false;
  }

  return (
    <>
      <nav className="grow">
        <header className="bg-secondary">
          <div className="px-4">
            <div className="flex justify-between items-center flex-1">
              <Link
                to="/"
                className="flex items-center gap-2 text-secondary-foreground no-underline"
              >
                <img
                  className="[.light_&]:hidden h-6"
                  src={darkModeLogo}
                  alt={title}
                />
                <img
                  className="[.dark_&]:hidden h-6"
                  src={lightModeLogo}
                  alt={title}
                />
                <h1 className="text-xl font-semibold">{title}</h1>
              </Link>
              <div>
                <nav className="flex">
                  <NavigationTab
                    label="Bacheca"
                    to="/"
                    isActive={currentPath === "/"}
                  />
                  <NavigationTab
                    label="Clienti"
                    to="/clients"
                    isActive={currentPath === "/clients"}
                  />
                  <NavigationTab
                    label="Progetti"
                    to="/projects"
                    isActive={currentPath === "/projects"}
                  />
                  <NavigationTab
                    label="Registro Lavori"
                    to="/services"
                    isActive={currentPath === "/services"}
                  />
                  <NavigationTab
                    label="Preventivi"
                    to="/quotes"
                    isActive={currentPath === "/quotes"}
                  />
                  <NavigationTab
                    label="Pagamenti"
                    to="/payments"
                    isActive={currentPath === "/payments"}
                  />
                  <NavigationTab
                    label="Spese"
                    to="/expenses"
                    isActive={currentPath === "/expenses"}
                  />
                  <NavigationTab
                    label="Promemoria"
                    to="/client_tasks"
                    isActive={currentPath === "/client_tasks"}
                  />
                </nav>
              </div>
              <div className="flex items-center">
                <ThemeModeToggle />
                <RefreshButton />
                <UserMenu>
                  <ProfileMenu />
                  <CanAccess resource="configuration" action="edit">
                    <SettingsMenu />
                  </CanAccess>
                </UserMenu>
              </div>
            </div>
          </div>
        </header>
      </nav>
    </>
  );
};

const NavigationTab = ({
  label,
  to,
  isActive,
}: {
  label: string;
  to: string;
  isActive: boolean;
}) => (
  <Link
    to={to}
    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
      isActive
        ? "text-secondary-foreground border-secondary-foreground"
        : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
    }`}
  >
    {label}
  </Link>
);

const ProfileMenu = () => {
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ProfileMenu> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/profile" className="flex items-center gap-2">
        <User />
        Profilo
      </Link>
    </DropdownMenuItem>
  );
};

const SettingsMenu = () => {
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<SettingsMenu> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/settings" className="flex items-center gap-2">
        <Settings /> Impostazioni
      </Link>
    </DropdownMenuItem>
  );
};

export default Header;
