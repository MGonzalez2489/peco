import {HttpContextToken} from '@angular/common/http';

/** Marks responses that are not wrapped in the API envelope, such as `/health`. */
export const RAW_RESPONSE = new HttpContextToken<boolean>(() => false);
