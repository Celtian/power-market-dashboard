export interface InputSelectOption<T extends string | number = string, R = undefined> {
  label: string;
  value: T;
  accessibleLabel?: string;
  description?: string;
  disabled?: boolean;
  extra?: R;
}
