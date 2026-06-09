"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

export const Card = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  id,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      id={id}
      className="card-shell p-1.5 transition-shadow duration-300 hover:shadow-soft-lg"
    >
      <div className="card-core overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-paper-50/60"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2.5 font-display text-base font-medium text-ink-800">
            {Icon && <Icon size={16} className="text-forest-700" />}
            {title}
          </div>
          {open ? (
            <ChevronUp size={16} className="text-ink-400" />
          ) : (
            <ChevronDown size={16} className="text-ink-400" />
          )}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 space-y-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
