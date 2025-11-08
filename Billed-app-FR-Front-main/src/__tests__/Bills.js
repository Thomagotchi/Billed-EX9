/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
import { ROUTES_PATH } from "../constants/routes.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import BillsUI from "../views/BillsUI.js";

jest.mock("../app/Store.js", () => mockStore);

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

        // Mock modal function and width method
        $.fn.modal = jest.fn();
        $.fn.width = jest.fn(() => 800);

        // This gets the eye buttons, checks that there are some and isolates the first one
        const eyeButtons = screen.getAllByTestId("icon-eye");
        expect(eyeButtons.length).toBeGreaterThan(0);
        const firstEyeButton = eyeButtons[0];

        // Simulate click event on the eye button
        fireEvent.click(firstEyeButton);

        // Verify that the modal was called and that the content is present in the DOM
        expect($.fn.modal).toHaveBeenCalledWith("show");
        expect(screen.getByText("Justificatif")).toBeTruthy();
        // Check for the modal element itself or the content that was added
        const modalElement = document.getElementById("modaleFile");
        expect(modalElement).toBeTruthy();
        // Check that the modal body has content (the image was added)
        const modalBody = modalElement.querySelector(".modal-body");
        expect(modalBody).toBeTruthy();
        expect(modalBody.querySelector("img")).toBeTruthy();
      });
    });
  });
});

// test d'intégration GET
describe("Given I am a user connected as an employee and I call getBills function", () => {
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

      // Mock the store to return an error
      jest.spyOn(mockStore, "bills").mockImplementationOnce(() => {
        return {
          list: () => Promise.reject(new Error("Erreur 404")),
        };
      });

      // Import and setup router
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

      // The container handles corrupted data gracefully by catching the formatDate error
      // and returning the data with the unformatted date, so getBills should resolve successfully
      const result = await billsContainer.getBills();

      // Verify that the data is returned successfully with the unformatted date
      expect(result).toBeTruthy();
      expect(result.length).toBe(1);
      expect(result[0].date).toBe("invalid-date"); // Should be the unformatted date
      expect(result[0].status).toBeTruthy(); // Status should still be formatted
    });
  });
});
