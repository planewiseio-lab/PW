import type { Meta, StoryObj } from "@storybook/react";
import SearchCluster from "../SearchCluster";

const meta: Meta<typeof SearchCluster> = {
  title: "Components/SearchCluster",
  component: SearchCluster,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: { type: "select" },
      options: ["aircraft", "flight", "airport"],
    },
    disabled: {
      control: { type: "boolean" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    mode: "aircraft",
    q: "",
    setMode: () => {},
    setQ: () => {},
    placeholder: "Registration (e.g. C-FRSR, N875BD)",
    onSubmit: () => {},
    disabled: false,
  },
};

export const FlightMode: Story = {
  args: {
    mode: "flight",
    q: "AC123",
    setMode: () => {},
    setQ: () => {},
    placeholder: "Flight No. (e.g. AC123)",
    onSubmit: () => {},
    disabled: false,
  },
};

export const AirportMode: Story = {
  args: {
    mode: "airport",
    q: "YUL",
    setMode: () => {},
    setQ: () => {},
    placeholder: "Airport (e.g. YUL or CYUL)",
    onSubmit: () => {},
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    mode: "aircraft",
    q: "",
    setMode: () => {},
    setQ: () => {},
    placeholder: "Registration (e.g. C-FRSR, N875BD)",
    onSubmit: () => {},
    disabled: true,
  },
};
