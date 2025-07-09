# Datadog Sales Engineering Toolkit Chrome Extension

## Background

The Datadog Sales Engineering Toolkit Chrome Extension is designed to empower Datadog Sales Engineers by enhancing their demonstration capabilities, simplifying access to frequently used resources, and supporting a dynamic, pluggable feature system. This extension addresses the need for streamlined demonstrations, secure credential management, and collaborative feature development within the sales engineering team.

## Problem Statement

* Sales engineers often face friction accessing relevant documents and tools during demonstrations.
* Manual integration of Datadog features into customer websites for demonstrations is cumbersome.
* Lack of a centralized, secure place for storing sensitive credentials such as API keys.

## Market Opportunity

* Sales and demo tools market expected to grow by 15% annually.
* Existing internal solutions lack modularity, ease of use, and collaborative feature contribution.
* Competitive differentiation through customizable, dynamic feature plugins.

## User Personas

* **Primary:** Datadog Sales Engineers

  * Need quick, secure access to documentation and Datadog integrations.
  * Require easy management and secure storage of API credentials.
  * Want the ability to customize demos dynamically.
* **Secondary:** Sales Engineering Managers

  * Desire visibility and control over features used by their team.

## Vision Statement

Create a versatile, secure, and user-friendly toolkit extension to enhance sales demonstrations and streamline access to internal resources.

## Product Origin

The idea originated from internal feedback indicating the repetitive nature of manual demonstrations and difficulty accessing vital documentation quickly.

## Objectives

### SMART Goals

* Launch initial version by end of Q3 2025.
* Enable secure API key storage validated by Datadog API.
* Deploy at least three pluggable features by initial release.
* Achieve adoption by 80% of sales engineers within six months post-launch.

### Key Performance Indicators (KPIs)

* Extension installation and active usage rates.
* Number of contributed plugins by sales engineering team.
* User satisfaction via regular surveys.

### Qualitative Objectives

* Enhance demonstration fluidity.
* Increase engineer efficiency and resource accessibility.

## Strategic Alignment

* Aligns with Datadog’s strategic goal of empowering customer-facing teams.
* Contributes to the company’s broader vision of seamless internal tooling.

## Risk Mitigation

* Security vulnerabilities: Encrypt sensitive storage using established encryption methodologies.
* Adoption risk: Continuous feedback loops with users for iterative improvement.

## Features

### Core Features

* **Secure Storage & Validation:** Datadog API key and App key management with regional validation.
* **Customizable Helpful Links:** Manageable quick-access resource links.
* **Feature Plugin System:** Dynamic feature addition and management.

### User Benefits

* Improved demo setup efficiency.
* Secure and easy credential management.
* Customizable functionality tailored to sales engineer needs.

### Technical Specifications

* **Manifest v3 compliant Chrome Extension.**
* **Secure Storage:** Abstract storage API utilizing `chrome.storage.local` and encryption.
* **UI Framework:** Mantine UI for consistent, accessible UX.
* **Routing:** React-router-dom with HashRouter for SPA-like navigation within Chrome extension limitations.
* **Plugin Architecture:** Modular plugin directory structure, dynamic loading/unloading.

### Feature Prioritization

* Must Have:

  * API credential management
  * Helpful Links
  * Pluggable Features Framework
  * Initial Plugin: RUM Injection
  * Initial Plugin: APM Tracing
  * Initial Plugin: Event Alerts

### Future Enhancements

* Expanded plugin library.
* Enhanced plugin management and marketplace features.

## User Experience

### User Interface (UI) Design

* Options page with a responsive 2/10 or 3/9 sidebar/content layout.
* Sidebar includes headers, button navigation tabs, and footer.

### User Journey

* Seamless login/authentication and intuitive configuration.
* Effortless switching and configuration of plugins and quick links.

### Usability Testing

* Conduct internal alpha testing with sales engineers.
* Iterative A/B testing for UI/UX elements.

### Accessibility

* Adhere to WCAG guidelines.
* Perform accessibility audits.

### Feedback Loops

* Built-in feedback forms and automated telemetry.
* Regular user interviews and surveys.

## Milestones

### Development Phases

1. Discovery and Design – July 2025
2. Development – August to September 2025
3. Internal Testing – Late September 2025
4. Public Release – Early October 2025

### Critical Path

* Secure storage implementation.
* Initial plugin system architecture.

### Review Points

* Bi-weekly sprint reviews.
* Monthly stakeholder presentations.

### Launch Plan

* Internal documentation and training.
* GitHub Actions for automation (testing, linting, deployment).
* Publishing via Chrome Extension Store.

### Post-Launch Evaluation

* Regular KPI tracking.
* Ongoing user feedback collection for continuous improvement.

## Technical Requirements

### Tech Stack

* Chrome Extension API (Manifest v3)
* React with Mantine UI
* React-router-dom (HashRouter)
* use-chrome-storage (npm)
* Encryption library for secure data storage

### System Architecture

* Directory Structure:

  * `src/background`
  * `src/popup`
  * `src/options`
  * `src/content`
  * `src/manifest.json`
  * `src/plugins/{plugin-name}` (dynamic loading)

### Security Measures

* Encryption/decryption of sensitive information.
* Regular security audits.

### Performance Metrics

* Monitor extension responsiveness.
* Regular load and stress tests.

### Integration Requirements

* Datadog API for credential validation and event polling.
* Pluggable API structure for third-party contributions.
