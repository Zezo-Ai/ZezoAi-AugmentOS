import {themes as prismThemes} from "prism-react-renderer"
import type {Config} from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "MentraOS SDK Docs",
  tagline: "Build your MentraOS smart glasses app.",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://docs.mentra.glass",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "mentra-community", // Usually your GitHub org/user name.
  projectName: "mentra", // Usually your repo name.

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove or update this to remove/edit "edit this page" links.
          editUrl: "https://github.com/mentra-community/mentraos/tree/main/docs/create-docusaurus/",
          routeBasePath: "/", // Set docs as the root
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],

  themeConfig: {
    // Social card for link previews
    image: "img/mentraos-social-card.png",
    metadata: [
      {name: "algolia-site-verification", content: "78682C22CC6FC033"},
      {name: "og:image", content: "https://docs.mentra.glass/img/mentraos-social-card.png"},
      {name: "twitter:image", content: "https://docs.mentra.glass/img/mentraos-social-card.png"},
      {name: "twitter:card", content: "summary_large_image"},
    ],
    navbar: {
      title: "MentraOS SDK Docs",
      logo: {
        alt: "MentraOS Logo",
        src: "img/logo.svg",
        srcDark: "img/logowhite.svg",
      },
      // Only docs in the navbar
      items: [
        {
          href: "https://github.com/mentra-community/mentraos",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Home",
              to: "/",
            },
            {
              label: "Quickstart",
              to: "/quickstart",
            },
            {
              label: "Build From Scratch",
              to: "/getting-started",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Discord",
              href: "https://discord.gg/5ukNvkEAqT",
            },
          ],
        },
        {
          title: "Source",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/mentra-community/mentraos",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Mentra. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
