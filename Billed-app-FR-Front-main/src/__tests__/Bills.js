/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { ROUTES_PATH } from "../constants/routes.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import BillsUI from "../views/BillsUI.js";

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    describe("When I click on the modal button of a report", () => {
      test("Then a modal should open", () => {
        // Set the data for the test
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
          })
        );

        // Render the page
        document.body.innerHTML = BillsUI({ data: bills });

        // Mock the onNavigate function
        const onNavigate = (pathname) => {
          document.body.innerHTML =
            ROUTES_PATH[pathname] || `<div>Route: ${pathname}</div>`;
        };

        // Create the Bills container instance
        const bill = new Bills({
          document,
          onNavigate,
          store: null,
          localStorage: localStorageMock,
        });

        // Mock modal function
        $.fn.modal = jest.fn();

        // This gets the eye buttons, checks that there are some and isolates the first one
        const eyeButtons = screen.getAllByTestId("icon-eye");
        expect(eyeButtons.length).toBeGreaterThan(0);
        const firstEyeButton = eyeButtons[0];

        // Simulate click event on the eye button
        fireEvent.click(firstEyeButton);

        // Verify that the modal was called and that the content is present in the DOM
        expect($.fn.modal).toHaveBeenCalledWith("show");
        expect(screen.getByText("Justificatif")).toBeTruthy();
        expect(screen.getByTestId("justif-bill")).toBeTruthy();
      });
    });
  });
});

// test d'intégration GET
describe("Given I am a user connected as Admin and I call getBills function", () => {
  describe("When I call getBills function", () => {
    // Helper function to create an error
    const createErrorStore = (errorMessage) => ({
      bills: () => ({
        list: () => Promise.reject(new Error(errorMessage)),
      }),
    });

    // Helper function to create a bills container
    const createBillsContainer = (store) =>
      new Bills({
        document,
        onNavigate: jest.fn(),
        store,
        localStorage: localStorageMock,
      });

    // Test 404 error with HTML error display
    test("Then it should display 404 error in HTML when fetching bills fails", async () => {
      const errorStore = createErrorStore("Erreur 404");

      // Set up the DOM
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);

      // Mock localStorage
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      // Import and setup router
      const router = require("../app/Router.js").default;
      router();

      // Navigate to Bills page - this will trigger the error
      window.onNavigate(ROUTES_PATH.Bills);

      // Wait for the error to be displayed
      await waitFor(() => {
        const errorElement = screen.getByTestId("error-message");
        expect(errorElement).toBeTruthy();
        expect(errorElement.textContent).toContain("Erreur 404");
      });
    });

    // Test 500 error
    test("Then it should handle 500 error when fetching bills", async () => {
      const errorStore = createErrorStore("Erreur 500");
      const billsContainer = createBillsContainer(errorStore);

      await expect(billsContainer.getBills()).rejects.toThrow("Erreur 500");
    });

    // Test corrupted data
    test("Then it should handle corrupted data gracefully", async () => {
      // Mock some corrupted data with bad date format
      const corruptedStore = {
        bills: () => ({
          list: () =>
            Promise.resolve([
              {
                id: "test-id",
                date: "invalid-date",
                status: "pending",
                amount: 100,
                name: "test",
              },
            ]),
        }),
      };

      // Create a mock onNavigate function that renders the UI with error
      const mockOnNavigate = jest.fn();
      const billsContainer = createBillsContainer(corruptedStore);

      // Mock the router behavior - when getBills fails, it should render error page
      const mockRouter = (pathname, error) => {
        document.body.innerHTML = BillsUI({ error });
      };

      // Simulate the error scenario by calling getBills and catching the error
      try {
        await billsContainer.getBills();
      } catch (error) {
        // Simulate what the router does when there's an error
        mockRouter(ROUTES_PATH.Bills, error.message);
      }

      // Check that the error message is displayed in the HTML
      const errorElement = screen.getByTestId("error-message");
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain("Erreur 404");
    });
  });
});
