import { registerDecorator, ValidationOptions } from "class-validator";
import {
  isCpf,
  isCnpj,
  isCpfCnpj,
  isPhone,
  isUf,
  MESSAGES,
} from "@comms-core/validation";

export function IsCpf(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isCpf",
      target: object.constructor,
      propertyName,
      options: { message: MESSAGES.cpf, ...options },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          return typeof value === "string" && isCpf(value);
        },
      },
    });
  };
}

export function IsCnpj(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isCnpj",
      target: object.constructor,
      propertyName,
      options: { message: MESSAGES.cnpj, ...options },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          return typeof value === "string" && isCnpj(value);
        },
      },
    });
  };
}

export function IsCpfCnpj(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isCpfCnpj",
      target: object.constructor,
      propertyName,
      options: { message: MESSAGES.cpfCnpj, ...options },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          return typeof value === "string" && isCpfCnpj(value);
        },
      },
    });
  };
}

export function IsPhone(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isPhone",
      target: object.constructor,
      propertyName,
      options: { message: MESSAGES.phone, ...options },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          return typeof value === "string" && isPhone(value);
        },
      },
    });
  };
}

export function IsUf(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isUf",
      target: object.constructor,
      propertyName,
      options: { message: MESSAGES.uf, ...options },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          return typeof value === "string" && isUf(value);
        },
      },
    });
  };
}
