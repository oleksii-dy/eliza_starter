module.exports = {
    apps: [
      {
        name: "client",
        script: "sh ./start_client.sh",
        // args: "run start",
        //cwd: "/home/laduc/workplace/eliza", // Thay bằng đường dẫn đến thư mục client
        env: {
          PORT: 5173,
          NODE_ENV: "production",
        },
      },
      {
        name: "server",
        // script: "sh",
        script: "sh ./start_server.sh",
       // cwd: "/home/laduc/workplace/eliza", // Thay bằng đường dẫn đến thư mục server
        env: {
          PORT: 3000,
          NODE_ENV: "production",
        },
      },
    ],
  };
