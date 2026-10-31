import type { Page } from "playwright";

export interface ToolCallResult {
  tool: string;
  success: boolean;
  output: string;
  screenshotBase64?: string;
  phase: "observe" | "act" | "verify";
  finding?: {
    title: string;
    severity: "high" | "medium" | "low";
    explanation: string;
    expected: string;
    actual: string;
    steps: string[];
  };
}

/**
 * Gemini / Gemma Function Declarations for Browser Testing.
 */
export const BROWSER_TOOL_DECLARATIONS = [
  {
    name: "navigate",
    description: "Navigate the browser page to a specific URL or route.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: {
          type: "STRING",
          description: "The absolute or relative URL to navigate to.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "click",
    description: "Click an interactive element (button, link, checkbox, or input) matching a CSS selector or visible text.",
    parameters: {
      type: "OBJECT",
      properties: {
        selector: {
          type: "STRING",
          description: "CSS selector or text selector (e.g. 'button:has-text(\"Checkout\")', '#submit-button').",
        },
        description: {
          type: "STRING",
          description: "Brief human-readable reason for clicking this element.",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "type_text",
    description: "Type text into an input field or textarea.",
    parameters: {
      type: "OBJECT",
      properties: {
        selector: {
          type: "STRING",
          description: "CSS selector for the target input element.",
        },
        text: {
          type: "STRING",
          description: "The text to type into the field.",
        },
        pressEnter: {
          type: "BOOLEAN",
          description: "Whether to press Enter after typing.",
        },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "inspect_dom",
    description: "Inspect the current DOM hierarchy, extracting visible interactive elements, form fields, and status texts.",
    parameters: {
      type: "OBJECT",
      properties: {
        selector: {
          type: "STRING",
          description: "Optional root CSS selector to inspect (defaults to 'body').",
        },
      },
    },
  },
  {
    name: "wait_for",
    description: "Wait for an element to appear or wait for a specific duration in milliseconds.",
    parameters: {
      type: "OBJECT",
      properties: {
        selector: {
          type: "STRING",
          description: "Optional CSS selector to wait for visibility.",
        },
        milliseconds: {
          type: "NUMBER",
          description: "Duration to wait in milliseconds (max 10000).",
        },
      },
    },
  },
  {
    name: "take_screenshot",
    description: "Capture a screenshot of the current browser page to inspect visual state and layout.",
    parameters: {
      type: "OBJECT",
      properties: {
        label: {
          type: "STRING",
          description: "Brief note describing why this snapshot was taken.",
        },
      },
    },
  },
  {
    name: "report_finding",
    description: "Report a confirmed bug, defect, race condition, or visual defect discovered during the test.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: {
          type: "STRING",
          description: "Concise summary of the bug (e.g., 'Repeated checkout click creates duplicate orders').",
        },
        severity: {
          type: "STRING",
          enum: ["high", "medium", "low"],
          description: "Severity rating of the issue.",
        },
        explanation: {
          type: "STRING",
          description: "Detailed analysis of the root cause or observed defect.",
        },
        expected: {
          type: "STRING",
          description: "What should have occurred in a correct implementation.",
        },
        actual: {
          type: "STRING",
          description: "What actually occurred during testing.",
        },
        steps: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Ordered reproduction steps to trigger the bug.",
        },
      },
      required: ["title", "severity", "explanation", "expected", "actual", "steps"],
    },
  },
  {
    name: "finish_test",
    description: "Complete the testing mission and provide a summary report.",
    parameters: {
      type: "OBJECT",
      properties: {
        summary: {
          type: "STRING",
          description: "Comprehensive summary of findings, tested flows, and final assessment.",
        },
        success: {
          type: "BOOLEAN",
          description: "Whether the tested application satisfied specifications.",
        },
      },
      required: ["summary", "success"],
    },
  },
];

/**
 * Executes a tool on the live Playwright browser page.
 */
export async function executeBrowserTool(
  page: Page,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      case "navigate": {
        const url = String(args.url || "");
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        const title = await page.title();
        const buffer = await page.screenshot({ type: "jpeg", quality: 75 });
        return {
          tool: "navigate",
          success: true,
          output: `Navigated to ${url}. Page title: "${title}".`,
          screenshotBase64: buffer.toString("base64"),
          phase: "act",
        };
      }

      case "click": {
        const selector = String(args.selector || "");
        await page.waitForSelector(selector, { timeout: 8000 });
        await page.click(selector, { timeout: 8000 });
        await page.waitForTimeout(500); // brief settling time
        const buffer = await page.screenshot({ type: "jpeg", quality: 75 });
        return {
          tool: "click",
          success: true,
          output: `Clicked element "${selector}". ${args.description ? `Intent: ${args.description}` : ""}`,
          screenshotBase64: buffer.toString("base64"),
          phase: "act",
        };
      }

      case "type_text": {
        const selector = String(args.selector || "");
        const text = String(args.text || "");
        await page.waitForSelector(selector, { timeout: 8000 });
        await page.fill(selector, text, { timeout: 8000 });
        if (args.pressEnter) {
          await page.press(selector, "Enter");
        }
        const buffer = await page.screenshot({ type: "jpeg", quality: 75 });
        return {
          tool: "type_text",
          success: true,
          output: `Typed "${text}" into "${selector}".`,
          screenshotBase64: buffer.toString("base64"),
          phase: "act",
        };
      }

      case "inspect_dom": {
        const rootSelector = String(args.selector || "body");
        const domTree = await page.evaluate((sel) => {
          const root = document.querySelector(sel) || document.body;
          const interactive: Array<{ tag: string; text: string; id?: string; name?: string; role?: string }> = [];

          const elements = root.querySelectorAll(
            "button, a, input, select, textarea, [role='button'], h1, h2, h3, .price, .badge, [aria-label]",
          );

          elements.forEach((el, index) => {
            if (index > 40) return; // limit context size
            const tag = el.tagName.toLowerCase();
            const text = (el.textContent || "").trim().slice(0, 80);
            interactive.push({
              tag,
              text,
              id: el.id || undefined,
              name: el.getAttribute("name") || undefined,
              role: el.getAttribute("role") || undefined,
            });
          });

          return {
            title: document.title,
            url: window.location.href,
            elements: interactive,
          };
        }, rootSelector);

        return {
          tool: "inspect_dom",
          success: true,
          output: JSON.stringify(domTree, null, 2),
          phase: "observe",
        };
      }

      case "wait_for": {
        const ms = Math.min(Number(args.milliseconds) || 1000, 10000);
        if (args.selector) {
          await page.waitForSelector(String(args.selector), { timeout: ms });
        } else {
          await page.waitForTimeout(ms);
        }
        return {
          tool: "wait_for",
          success: true,
          output: `Waited for ${ms}ms${args.selector ? ` and selector "${args.selector}"` : ""}.`,
          phase: "observe",
        };
      }

      case "take_screenshot": {
        const buffer = await page.screenshot({ type: "jpeg", quality: 75 });
        return {
          tool: "take_screenshot",
          success: true,
          output: `Captured snapshot: ${args.label || "Page overview"}`,
          screenshotBase64: buffer.toString("base64"),
          phase: "observe",
        };
      }

      case "report_finding": {
        const finding = {
          title: String(args.title || "Discovered defect"),
          severity: (args.severity as "high" | "medium" | "low") || "medium",
          explanation: String(args.explanation || ""),
          expected: String(args.expected || ""),
          actual: String(args.actual || ""),
          steps: Array.isArray(args.steps) ? args.steps.map(String) : [],
        };
        const buffer = await page.screenshot({ type: "jpeg", quality: 75 });
        return {
          tool: "report_finding",
          success: true,
          output: `Confirmed defect recorded: "${finding.title}"`,
          screenshotBase64: buffer.toString("base64"),
          phase: "verify",
          finding,
        };
      }

      case "finish_test": {
        const buffer = await page.screenshot({ type: "jpeg", quality: 75 });
        return {
          tool: "finish_test",
          success: true,
          output: `Testing complete. Assessment: ${args.success ? "Passed" : "Failed"}. Summary: ${args.summary}`,
          screenshotBase64: buffer.toString("base64"),
          phase: "verify",
        };
      }

      default:
        return {
          tool: toolName,
          success: false,
          output: `Unknown tool: "${toolName}". Available tools: navigate, click, type_text, inspect_dom, wait_for, take_screenshot, report_finding, finish_test.`,
          phase: "observe",
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      tool: toolName,
      success: false,
      output: `Error executing ${toolName}: ${message}`,
      phase: "act",
    };
  }
}
