"use client";

import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import { TextField } from "@/components/ui/text-field";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
};

export const PasswordField = ({
  name,
  label,
  autoComplete,
  minLength,
}: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <TextField
        id={name}
        name={name}
        label={label}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        maxLength={72}
        placeholder={
          minLength ? "8자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"
        }
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible((previous) => !previous)}
        aria-label={`${label} ${visible ? "숨기기" : "보기"}`}
        aria-pressed={visible}
        className="absolute right-2 bottom-2 grid size-8 place-items-center rounded text-content-tertiary hover:bg-surface-hover"
      >
        {visible ? (
          <FaEyeSlash aria-hidden="true" />
        ) : (
          <FaEye aria-hidden="true" />
        )}
      </button>
    </div>
  );
};
