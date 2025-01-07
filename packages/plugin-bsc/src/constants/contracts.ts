export const erc20Contract = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    contract CustomERC20 {
        string public name;
        string public symbol;
        uint8 public decimals;
        uint256 public totalSupply;
        mapping(address => uint256) public balanceOf;
        mapping(address => mapping(address => uint256)) public allowance;

        event Transfer(address indexed from, address indexed to, uint256 value);
        event Approval(address indexed owner, address indexed spender, uint256 value);

        constructor(
            string memory _name,
            string memory _symbol,
            uint8 _decimals,
            uint256 _totalSupply
        ) {
            name = _name;
            symbol = _symbol;
            decimals = _decimals;
            totalSupply = _totalSupply;
            balanceOf[msg.sender] = _totalSupply;
            emit Transfer(address(0), msg.sender, _totalSupply);
        }

        function transfer(address to, uint256 value) public returns (bool) {
            require(balanceOf[msg.sender] >= value, "Insufficient balance");
            balanceOf[msg.sender] -= value;
            balanceOf[to] += value;
            emit Transfer(msg.sender, to, value);
            return true;
        }

        function approve(address spender, uint256 value) public returns (bool) {
            allowance[msg.sender][spender] = value;
            emit Approval(msg.sender, spender, value);
            return true;
        }

        function transferFrom(address from, address to, uint256 value) public returns (bool) {
            require(balanceOf[from] >= value, "Insufficient balance");
            require(allowance[from][msg.sender] >= value, "Insufficient allowance");
            balanceOf[from] -= value;
            balanceOf[to] += value;
            allowance[from][msg.sender] -= value;
            emit Transfer(from, to, value);
            return true;
        }
    }
  `;

export const erc721Contract = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;

      contract CustomERC721 {
          event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
          event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
          event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

          string public name;
          string public symbol;
          string public baseURI;

          // Token ID to owner address
          mapping(uint256 => address) private _owners;

          // Owner address to token count
          mapping(address => uint256) private _balances;

          // Token ID to approved address
          mapping(uint256 => address) private _tokenApprovals;

          // Owner to operator approvals
          mapping(address => mapping(address => bool)) private _operatorApprovals;

          constructor(string memory _name, string memory _symbol, string memory _baseURI) {
              name = _name;
              symbol = _symbol;
              baseURI = _baseURI;
          }

          function balanceOf(address owner) public view returns (uint256) {
              require(owner != address(0), "ERC721: balance query for the zero address");
              return _balances[owner];
          }

          function ownerOf(uint256 tokenId) public view returns (address) {
              address owner = _owners[tokenId];
              require(owner != address(0), "ERC721: owner query for nonexistent token");
              return owner;
          }

          function approve(address to, uint256 tokenId) public {
              address owner = ownerOf(tokenId);
              require(to != owner, "ERC721: approval to current owner");
              require(msg.sender == owner || isApprovedForAll(owner, msg.sender),
                  "ERC721: approve caller is not owner nor approved for all"
              );
              _tokenApprovals[tokenId] = to;
              emit Approval(owner, to, tokenId);
          }

          function getApproved(uint256 tokenId) public view returns (address) {
              require(_owners[tokenId] != address(0), "ERC721: approved query for nonexistent token");
              return _tokenApprovals[tokenId];
          }

          function setApprovalForAll(address operator, bool approved) public {
              require(operator != msg.sender, "ERC721: approve to caller");
              _operatorApprovals[msg.sender][operator] = approved;
              emit ApprovalForAll(msg.sender, operator, approved);
          }

          function isApprovedForAll(address owner, address operator) public view returns (bool) {
              return _operatorApprovals[owner][operator];
          }

          function mint(address to, uint256 tokenId) public {
              require(to != address(0), "ERC721: mint to the zero address");
              require(_owners[tokenId] == address(0), "ERC721: token already minted");

              _balances[to] += 1;
              _owners[tokenId] = to;

              emit Transfer(address(0), to, tokenId);
          }

          function tokenURI(uint256 tokenId) public view returns (string memory) {
              require(_owners[tokenId] != address(0), "ERC721: URI query for nonexistent token");
              return string(abi.encodePacked(baseURI, toString(tokenId)));
          }

          function toString(uint256 value) internal pure returns (string memory) {
              if (value == 0) {
                  return "0";
              }
              uint256 temp = value;
              uint256 digits;
              while (temp != 0) {
                  digits++;
                  temp /= 10;
              }
              bytes memory buffer = new bytes(digits);
              while (value != 0) {
                  digits -= 1;
                  buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
                  value /= 10;
              }
              return string(buffer);
          }
      }
    `;

export const erc1155Contract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CustomERC1155 {
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    string public name;
    string public baseURI;

    mapping(address => mapping(uint256 => uint256)) private _balances;

    mapping(address => mapping(address => bool)) private _operatorApprovals;

    mapping(uint256 => uint256) public maxSupply;

    mapping(uint256 => uint256) public totalSupply;

    constructor(string memory _name, string memory _baseURI) {
        name = _name;
        baseURI = _baseURI;
    }

    function setMaxSupply(uint256 id, uint256 max) public {
        require(maxSupply[id] == 0, "Max supply already set");
        maxSupply[id] = max;
    }

    function mint(address to, uint256 id, uint256 amount) public {
        require(to != address(0), "Cannot mint to zero address");
        require(maxSupply[id] == 0 || totalSupply[id] + amount <= maxSupply[id], "Would exceed max supply");

        _balances[to][id] += amount;
        totalSupply[id] += amount;

        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) public {
        require(to != address(0), "Cannot mint to zero address");
        require(ids.length == amounts.length, "Length mismatch");

        for(uint i = 0; i < ids.length; i++) {
            require(maxSupply[ids[i]] == 0 || totalSupply[ids[i]] + amounts[i] <= maxSupply[ids[i]],
                "Would exceed max supply");
            _balances[to][ids[i]] += amounts[i];
            totalSupply[ids[i]] += amounts[i];
        }

        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
    }

    function balanceOf(address owner, uint256 id) public view returns (uint256) {
        require(owner != address(0), "Zero address query");
        return _balances[owner][id];
    }

    function balanceOfBatch(address[] memory owners, uint256[] memory ids) public view returns (uint256[] memory) {
        require(owners.length == ids.length, "Length mismatch");
        uint256[] memory balances = new uint256[](owners.length);

        for(uint i = 0; i < owners.length; i++) {
            balances[i] = balanceOf(owners[i], ids[i]);
        }

        return balances;
    }

    function setApprovalForAll(address operator, bool approved) public {
        require(msg.sender != operator, "Cannot approve self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount) public {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(msg.sender == from || isApprovedForAll(from, msg.sender), "Not approved");
        require(_balances[from][id] >= amount, "Insufficient balance");

        _balances[from][id] -= amount;
        _balances[to][id] += amount;

        emit TransferSingle(msg.sender, from, to, id, amount);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts) public {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(ids.length == amounts.length, "Length mismatch");
        require(msg.sender == from || isApprovedForAll(from, msg.sender), "Not approved");

        for(uint i = 0; i < ids.length; i++) {
            require(_balances[from][ids[i]] >= amounts[i], "Insufficient balance");
            _balances[from][ids[i]] -= amounts[i];
            _balances[to][ids[i]] += amounts[i];
        }

        emit TransferBatch(msg.sender, from, to, ids, amounts);
    }

    function uri(uint256 id) public view returns (string memory) {
        return string(abi.encodePacked(baseURI, toString(id)));
    }

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
`;
