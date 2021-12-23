import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "remix";
import { DialogOverlay, DialogContent } from "@reach/dialog";
import { VisuallyHidden } from "@reach/visually-hidden";

type NavbarItem = {
  to: string;
  label: string;
  shownIn: "navbar" | "menu" | "both";
};

const NAVBAR_ITEMS: NavbarItem[] = [
  { to: "/", label: "Dashboard", shownIn: "both" },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

function Header() {
  let { key: locationKey } = useLocation();

  let [showDialog, setShowDialog] = useState(false);
  let close = () => setShowDialog(false);
  let open = () => setShowDialog(true);

  useEffect(() => {
    if (showDialog) {
      close();
    }
  }, [locationKey]);

  return (
    <>
      <Navbar
        className="sticky z-30 top-0 bg-base-100 text-base-content shadow-lg"
        menuLabel="open menu"
        onMenuClicked={open}
      />
      <DialogOverlay
        className="fixed top-0 left-0 h-screen w-screen z-40"
        isOpen={showDialog}
        onDismiss={close}
      >
        <DialogContent
          aria-label="Menu"
          className="m-0 w-screen p-0 shadow-lg bg-base-100 text-base-content"
        >
          <Navbar menuLabel="close menu" onMenuClicked={close} />

          <nav>
            <ul className="menu">
              {NAVBAR_ITEMS.map((item, idx) =>
                ["menu", "both"].includes(item.shownIn) ? (
                  <li key={idx}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ) : null
              )}
            </ul>
          </nav>
        </DialogContent>
      </DialogOverlay>
    </>
  );
}

function Navbar({
  className,
  menuLabel,
  onMenuClicked,
}: {
  className?: string;
  menuLabel: string;
  onMenuClicked: () => void;
}) {
  return (
    <div className={"navbar" + (className ? " " + className : "")}>
      <div className="flex-1 px-2 mx-2">
        <span className="text-lg font-bold">COVID SUCKS</span>
      </div>
      <nav>
        <ul className="flex-none hidden px-2 mx-2 md:flex">
          {NAVBAR_ITEMS.map((item, idx) =>
            ["navbar", "both"].includes(item.shownIn) ? (
              <li key={idx} className="flex items-stretch">
                <Link to={item.to} className="btn btn-ghost btn-sm rounded-btn">
                  {item.label}
                </Link>
              </li>
            ) : null
          )}
        </ul>
      </nav>
      <div className="flex-none md:hidden">
        <button className="btn btn-square btn-ghost" onClick={onMenuClicked}>
          <VisuallyHidden>{menuLabel}</VisuallyHidden>
          <Hamburger />
        </button>
      </div>
    </div>
  );
}

function Hamburger() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="inline-block w-6 h-6 stroke-current"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 6h16M4 12h16M4 18h16"
      ></path>
    </svg>
  );
}
