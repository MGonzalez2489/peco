import { COLORS } from "@styles/colors";
import { ComponentStyles } from "@styles/components";
import { useState } from "react";
import DropDownPicker from "react-native-dropdown-picker";

interface Props {
  formControlName: string;
  labelId: string;
  valueId: string;
  icon?: string;
  items: any[];
  setFieldValue?: any;
  placeholder?: string;
}

export const DropDown = ({
  formControlName,
  labelId,
  valueId,
  icon,
  items,
  setFieldValue,
  placeholder = "Select Item",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  return (
    <DropDownPicker
      schema={{
        label: labelId,
        value: valueId,
        icon: icon,
      }}
      open={open}
      value={value}
      setOpen={setOpen}
      setValue={setValue}
      style={ComponentStyles.input}
      items={items}
      placeholder={placeholder}
      onChangeValue={(selectedValue: any) => {
        if (setFieldValue) setFieldValue(formControlName, selectedValue);
      }}
      listItemContainerStyle={{
        backgroundColor: COLORS.background,
      }}
      dropDownContainerStyle={{
        borderTopWidth: 0,
        borderColor: "#E0E0E0",
      }}
    />
  );
};
