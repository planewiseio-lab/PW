import type { Meta, StoryObj } from "@storybook/react";
import ScrollToTop from "../layout/ScrollToTop";

const meta: Meta<typeof ScrollToTop> = {
  title: "Components/ScrollToTop",
  component: ScrollToTop,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Visible: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "The button appears when scrolling down 300px from the top.",
      },
    },
  },
};
