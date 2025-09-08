/**
 * Dto used tu request information to the API,
 * It includes pagination data and filters
 */
export class SearchDto {
  /**
   * Page to show
   */
  page = 1;
  /**
   * Items per page
   */

  take = 10;
  /**
   * identify if we want to request all data
   */

  showAll = false;
  /**
   * Order to show the data
   */

  order: "ASC" | "DESC" = "DESC";

  /**
   * Property used to order
   */
  orderBy?: string = "createdAt";
  /**
   * Generic field used to find by contains
   */
  hint?: string;
}
