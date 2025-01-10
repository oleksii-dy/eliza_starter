// Permissions Module Query Templates

export const getAddressesByRoleTemplate = `
### Get Addresses by Role

**Description**:
This query retrieves all addresses associated with a specific role within the Permissions module. It is useful for managing permissions, auditing roles, and ensuring that only authorized addresses hold certain roles.

**Request Format**:
\`\`\`json
{
    "role": string   // Identifier of the role (e.g., "admin", "validator")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "role": "admin"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123480,
    "txHash": "UVW123xyz789...",
    "codespace": "",
    "code": 0,
    "data": "W3sidGVybSI6ICJhZG1pbiIsICJhZGRyZXNzIjogImluamExc2VybmVyczEyMzQ1NiJ9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_addresses_by_role\", \"attributes\": [{\"key\": \"role\", \"value\": \"admin\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 150000,
    "gasUsed": 100000,
    "timestamp": "2025-02-10T10:15:20Z",
    "events": []
}
\`\`\`
`;

export const getAddressRolesTemplate = `
### Get Roles by Address

**Description**:
This query retrieves all roles associated with a specific address within the Permissions module. It helps in understanding the permissions and responsibilities assigned to an address.

**Request Format**:
\`\`\`json
{
    "address": string   // Address identifier (e.g., "inj1address...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "address": "inj1address1234567890..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123481,
    "txHash": "XYZ456mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "WyJ1c2VyIiwgImFkbWluIl0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_address_roles\", \"attributes\": [{\"key\": \"address\", \"value\": \"inj1address1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 140000,
    "gasUsed": 90000,
    "timestamp": "2025-02-11T11:20:30Z",
    "events": []
}
\`\`\`
`;

export const getAllNamespacesTemplate = `
### Get All Namespaces

**Description**:
This query retrieves all namespaces defined within the Permissions module. Namespaces help in organizing roles and permissions, ensuring a structured and scalable permission system.

**Request Format**:
\`\`\`json
{}
\`\`\`

**Example Request**:
\`\`\`json
{}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123482,
    "txHash": "ABC789qrstuv...",
    "codespace": "",
    "code": 0,
    "data": "WyJuYW1lc3BhY2UxIiwgIm5hbWVzcGFjZTIlIl0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_all_namespaces\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 130000,
    "gasUsed": 80000,
    "timestamp": "2025-02-12T12:25:40Z",
    "events": []
}
\`\`\`
`;
export const getNamespaceByDenomTemplate = `
### Get Namespace by Denomination

**Description**:
This query retrieves the namespace associated with a specific denomination. Namespaces categorize denominations, facilitating organized permission management and role assignments.

**Request Format**:
\`\`\`json
{
    "denom": string   // Denomination identifier (e.g., "factory/inj/denom1")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "denom": "factory/inj/denom1"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123484,
    "txHash": "GHI345mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "Im5hbWVzcGFjZTElIg==",
    "rawLog": "[{\"events\": [{\"type\": \"get_namespace_by_denom\", \"attributes\": [{\"key\": \"denom\", \"value\": \"factory/inj/denom1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 110000,
    "timestamp": "2025-02-14T14:35:55Z",
    "events": []
}
\`\`\`
`;

export const getVouchersForAddressTemplate = `
### Get Vouchers for Address

**Description**:
This query retrieves all vouchers associated with a specific address. Vouchers represent entitlements or permissions granted to an address within the Permissions module.

**Request Format**:
\`\`\`json
{
    "address": string   // Address identifier (e.g., "inj1address...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "address": "inj1address1234567890..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123485,
    "txHash": "JKL678qrstuv...",
    "codespace": "",
    "code": 0,
    "data": "WyJ2b2NoZXIiLCAidm9jaGVyIl0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_vouchers_for_address\", \"attributes\": [{\"key\": \"address\", \"value\": \"inj1address1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 170000,
    "gasUsed": 120000,
    "timestamp": "2025-02-15T15:40:05Z",
    "events": []
}
\`\`\`
`;
export const getPermissionsModuleParamsTemplate = `
### Get Permissions Module Parameters

**Description**:
This query retrieves the current parameters of the Permissions module. Parameters define the behavior and constraints of the module, such as role definitions and permission settings.

**Request Format**:
\`\`\`json
{}
\`\`\`

**Example Request**:
\`\`\`json
{}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123486,
    "txHash": "LMN901abcdefgh...",
    "codespace": "",
    "code": 0,
    "data": "CgZwYXJhbWV0ZXJzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_permissions_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 130000,
    "gasUsed": 90000,
    "timestamp": "2025-02-16T16:45:10Z",
    "events": []
}
\`\`\`
`;
