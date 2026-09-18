import type { Page, Locator } from "playwright";
import { formatJourneyDateForUi, type Quota, type Station, type TripConfig } from "../../core/tripConfig.js";
import { detectPageState, type PageStateResult } from "../../core/pageState.js";
import { detectSite } from "../detectSite.js";

export interface TrainSearchResult {
  readonly state: PageStateResult;
  readonly resultCount: number;
  readonly visibleTrainNumbers: readonly string[];
}

export class NgetTrainSearchPageError extends Error {
  public override readonly name = "NgetTrainSearchPageError";
}

export class NgetTrainSearchPage {
  private searchSubmitted = false;

  public constructor(private readonly page: Page) {}

  public async verifyTrainSearchPage(): Promise<void> {
    const site = detectSite(this.page.url());
    if (site !== "NGET") throw new NgetTrainSearchPageError(`Expected NGET page, detected ${site}.`);

    await this.dismissLanguagePromptIfBlocking();

    const title = await this.page.title().catch(() => "");
    const visibleText = await this.page.locator("body").innerText({ timeout: 2_000 }).catch(() => "");
    const state = detectPageState({ site, url: this.page.url(), title, visibleText });
    if (state.decision !== "CONTINUE" || state.state !== "TRAIN_SEARCH") {
      throw new NgetTrainSearchPageError(`NGET train-search page is not usable; observed state ${state.state}.`);
    }

    const source = this.sourceField();
    const destination = this.destinationField();
    const date = this.dateField();
    const search = this.searchButton();
    await source.waitFor({ state: "visible" });
    await destination.waitFor({ state: "visible" });
    await date.waitFor({ state: "visible" });
    await search.waitFor({ state: "visible" });
  }

  public async fillSource(station: Station): Promise<void> {
    await this.fillStation(this.sourceField(), station, "source");
  }

  public async fillDestination(station: Station): Promise<void> {
    await this.fillStation(this.destinationField(), station, "destination");
  }

  public async setJourneyDate(journeyDate: string): Promise<void> {
    const field = this.dateField();
    const uiDate = formatJourneyDateForUi(journeyDate);
    await field.fill(uiDate);
    await field.press("Tab");
    const actual = await field.inputValue();
    if (actual !== uiDate) throw new NgetTrainSearchPageError(`Journey date was not accepted; observed ${actual || "empty"}.`);
  }

  public async selectQuota(quota: Quota): Promise<void> {
    void quota;
    throw new NgetTrainSearchPageError("NGET quota control structure is not live-verified; quota automation is disabled until observed.");
  }

  public async submitSearch(trip: TripConfig): Promise<TrainSearchResult> {
    if (this.searchSubmitted) throw new NgetTrainSearchPageError("Search submission was already attempted; automatic retry is disabled.");
    await this.verifyAcceptedTrip(trip);
    this.searchSubmitted = true;
    await this.searchButton().click();
    await this.page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
    return this.readResultState();
  }

  public async readResultState(): Promise<TrainSearchResult> {
    const title = await this.page.title().catch(() => "");
    const visibleText = await this.page.locator("body").innerText({ timeout: 2_000 }).catch(() => "");
    const visibleTrainNumbers = [...new Set(visibleText.match(/\b\d{5}\b/g) ?? [])];
    const hasResultTerms = /train\s*(number|name|results?)|departure|arrival|availability|class/i.test(visibleText);
    const pageState = detectPageState({
      site: detectSite(this.page.url()),
      url: this.page.url(),
      title,
      visibleText,
      trainResultCount: hasResultTerms ? visibleTrainNumbers.length : 0,
      hasTrainResultStructure: hasResultTerms && visibleTrainNumbers.length > 0,
    });
    return {
      state: pageState,
      resultCount: visibleTrainNumbers.length,
      visibleTrainNumbers,
    };
  }

  private sourceField(): Locator {
    return this.page.getByRole("searchbox", { name: "Enter From station. Input is Mandatory." });
  }

  private destinationField(): Locator {
    return this.page.getByRole("searchbox", { name: "Enter To station. Input is Mandatory." });
  }

  private dateField(): Locator {
    return this.page.locator("p-calendar#jDate input");
  }

  private searchButton(): Locator {
    return this.page.getByRole("button", { name: "Search Trains", exact: true });
  }

  private async dismissLanguagePromptIfBlocking(): Promise<void> {
    const dialog = this.page.getByRole("dialog");
    if (await dialog.count() === 0 || !(await dialog.first().isVisible().catch(() => false))) return;

    const english = dialog.first().getByText("English", { exact: true });
    if (!(await english.isVisible().catch(() => false))) {
      throw new NgetTrainSearchPageError("The observed language dialog is visible but has no usable English action.");
    }
    await english.click();
    await dialog.first().waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
  }

  private async fillStation(field: Locator, station: Station, label: string): Promise<void> {
    void field;
    void station;
    void label;
    throw new NgetTrainSearchPageError("NGET station autocomplete structure is not live-verified; station automation is disabled until observed.");
  }

  private async verifyAcceptedTrip(trip: TripConfig): Promise<void> {
    const source = (await this.sourceField().inputValue()).toUpperCase();
    const destination = (await this.destinationField().inputValue()).toUpperCase();
    const date = await this.dateField().inputValue();
    if (!source.includes(trip.fromStation.code) || !destination.includes(trip.toStation.code)) {
      throw new NgetTrainSearchPageError("Search submission blocked because station selections were not verified.");
    }
    if (date !== formatJourneyDateForUi(trip.journeyDate)) {
      throw new NgetTrainSearchPageError("Search submission blocked because the journey date was not verified.");
    }
  }
}
