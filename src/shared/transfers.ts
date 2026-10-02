// The two paths of the transfers API, shared since feature 24: the statement already
// read the doubtful count (feature 23) and the transfers screen is the second feature
// that needs them. Paths are absolute so they resolve against the API origin.

export const TRANSFERS_PATH = '/api/transfers'
export const AMBIGUOUS_TRANSFERS_PATH = '/api/transfers/ambiguous'
