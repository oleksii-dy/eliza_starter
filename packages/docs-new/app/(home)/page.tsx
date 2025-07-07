import Link from 'next/link';

export const metadata = {
  title: 'ElizaOS - Multi-Agent Simulation Framework',
  description: 'Build, deploy, and manage autonomous AI agents with ElizaOS - a powerful TypeScript framework for creating intelligent agents across multiple platforms',
};

export default function HomePage() {
  return (
    <main style={{ flex: 1 }}>
      {/* Hero Section */}
      <section 
        style={{
          padding: '6rem 20px 2rem',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '3rem',
            position: 'relative',
            paddingBottom: '3rem'
          }}>
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              zIndex: 1
            }}>
              <h1 style={{ 
                fontSize: '3.2rem', 
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em'
              }}>
                <span style={{ 
                  fontWeight: 900,
                  letterSpacing: '-0.03em'
                }}>eliza</span> is a{' '}
                <span style={{ 
                  background: 'linear-gradient(135deg, #ff9500 0%, #ff7700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 800
                }}>powerful AI agent framework</span> for autonomy & personality
              </h1>
              <p style={{ 
                fontSize: '1.5rem', 
                opacity: 0.8,
                marginBottom: '2rem',
                lineHeight: 1.4
              }}>
                Build multi-agent systems that matter
              </p>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <Link
                  href="/docs/quickstart"
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #ff9500 0%, #ff7700 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    display: 'inline-block',
                  }}
                >
                  Get Started
                </Link>
                <a
                  href="https://github.com/elizaOS/eliza"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '0.5rem'
                  }}
                >
                  <iframe
                    src="https://ghbtns.com/github-btn.html?user=elizaos&repo=eliza&type=star&count=true&size=large"
                    frameBorder="0"
                    scrolling="0"
                    width="170"
                    height="30"
                    title="GitHub"
                    style={{ border: 'none' }}
                  ></iframe>
                </a>
              </div>
              <div style={{
                backgroundColor: 'var(--fd-background)',
                color: 'var(--fd-foreground)',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                marginTop: '1.5rem',
                display: 'inline-block',
                fontSize: '0.95rem',
                textAlign: 'center',
                border: '1px solid var(--fd-border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease'
              }}>
                <span style={{
                  backgroundColor: '#ff9500',
                  color: 'white',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  marginRight: '0.5rem',
                  textTransform: 'uppercase'
                }}>NEW!</span>
                <span>Copy </span>
                <Link href="/llms-full.txt" target="_blank" style={{
                  fontWeight: 'bold',
                  color: '#ff9500',
                  textDecoration: 'none'
                }}>
                  llms-full.txt
                </Link>
                <span> to chat with the docs using LLMs 💬</span>
              </div>
            </div>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute',
                  width: '350px',
                  height: '350px',
                  background: 'radial-gradient(circle, rgba(255, 149, 0, 0.2) 0%, rgba(255, 149, 0, 0) 70%)',
                  borderRadius: '50%',
                  filter: 'blur(40px)',
                  opacity: 0.6,
                  zIndex: 0
                }}></div>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '500px',
                  background: '#1a1a1a',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                  zIndex: 1,
                  transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    background: '#252525',
                    padding: '0.8rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57', marginRight: '8px' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e', marginRight: '8px' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840', marginRight: '8px' }}></div>
                    <div style={{
                      marginLeft: '1rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}>terminal</div>
                  </div>
                  <pre style={{ 
                    background: '#0a0a0a',
                    color: '#f8f8f8',
                    padding: '1.5rem',
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    margin: 0,
                    borderRadius: 0
                  }}>
                    <code>
                      <span style={{ color: '#6a737d' }}># Uses node 23+</span><br/>
                      <span style={{ color: '#7b9aff', fontWeight: 'bold', marginRight: '0.5rem' }}>$</span>bun install -g @elizaos/cli<br/>
                      <span style={{ color: '#7b9aff', fontWeight: 'bold', marginRight: '0.5rem' }}>$</span>elizaos create
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Quick Actions</h2>
            <p style={{ color: 'var(--fd-muted-foreground)', fontSize: '1.2rem' }}>Get started with ElizaOS in just a few clicks</p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
            gap: '24px',
            marginBottom: '4rem'
          }}>
            <ActionCard
              title="🤖 Create an Agent"
              description="Get started building your first autonomous AI agent with our step-by-step quickstart."
              imageSrc="/img/eliza_banner.jpg"
              primaryLink="/docs/quickstart"
              primaryText="Start Building"
              secondaryLink="/docs/quickstart"
              secondaryText="View Quickstart Guide"
            />
            <ActionCard
              title="🧩 Discover Plugins"
              description="Explore the ecosystem of plugins that extend your agent's abilities and integrations across platforms."
              imageSrc="/img/plugins.jpg"
              primaryLink="/packages"
              primaryText="Browse Plugins"
              secondaryLink="/packages"
              secondaryText="See package showcase"
            />
            <ActionCard
              title="💡 Get Inspired"
              description="Browse examples and resources from the community to spark ideas for your next AI agent project."
              imageSrc="/img/banner2.png"
              primaryLink="/docs/awesome-eliza"
              primaryText="Explore Resources"
              secondaryLink="/docs/awesome-eliza"
              secondaryText="View awesome-eliza"
            />
            <ActionCard
              title="🤝 Explore Partners"
              description="Discover the organizations and projects collaborating within the Eliza ecosystem."
              imageSrc="/img/partners.jpg"
              primaryLink="/partners"
              primaryText="View Partners"
              secondaryLink="/partners"
              secondaryText="Partner Docs"
              secondaryIcon="📄"
            />
            <ActionCard
              title="🎬 Video Gallery"
              description="Watch demos, tutorials, and community showcases related to ElizaOS."
              imageSrc="/img/videos.jpg"
              primaryLink="/community/videos"
              primaryText="Watch Videos"
              secondaryLink="/community/videos"
              secondaryText="Go to Gallery"
              secondaryIcon="▶️"
            />
            <ActionCard
              title="📊 GitHub Activity"
              description="See the latest GitHub news, project statistics, and contributor leaderboards."
              imageSrc="/img/stats.png"
              primaryLink="https://elizaos.github.io/"
              primaryText="View Stats"
              secondaryLink="https://elizaos.github.io/"
              secondaryText="Leaderboard"
              secondaryIcon="🏆"
              external={true}
            />
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section style={{ padding: '60px 20px', background: 'var(--fd-muted)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Overview</h2>
            <p style={{ color: 'var(--fd-muted-foreground)', fontSize: '1.2rem' }}>Explore the core components that power ElizaOS</p>
          </div>
          
          <div style={{ display: 'grid', gap: '40px' }}>
            <ComponentSection
              title="Core Components"
              items={[
                { 
                  title: '🤖 Agent Runtime', 
                  description: 'Orchestrates agent behavior, manages state, and coordinates components.',
                  link: '/docs/core/agents',
                  imageSrc: '/img/agentruntime.jpg'
                },
                { 
                  title: '📚 Services', 
                  description: 'Enables agents to communicate across Discord, Twitter, Telegram, and other platforms.',
                  link: '/docs/core/services',
                  imageSrc: '/img/services.jpg'
                },
                { 
                  title: '💾 Database', 
                  description: 'Stores memories, entity data, relationships, and configuration using vector search.',
                  link: '/docs/core/database',
                  imageSrc: '/img/database.jpg'
                },
              ]}
            />
            <ComponentSection
              title="Intelligence & Behavior"
              items={[
                { 
                  title: '⚡ Actions', 
                  description: 'Executable capabilities for agents to respond and interact with systems.',
                  link: '/docs/core/actions',
                  imageSrc: '/img/actions.jpg'
                },
                { 
                  title: '🔌 Providers', 
                  description: 'Supplies context to inform agent decisions in real time.',
                  link: '/docs/core/providers',
                  imageSrc: '/img/providers.jpg'
                },
                { 
                  title: '📊 Evaluators', 
                  description: 'Analyzes conversations to extract insights and improve future responses.',
                  link: '/docs/core/evaluators',
                  imageSrc: '/img/evaluators.jpg'
                },
              ]}
            />
            <ComponentSection
              title="Structure & Organization"
              items={[
                { 
                  title: '🌐 Worlds', 
                  description: 'Organizes environments like servers or projects.',
                  link: '/docs/core/worlds',
                  imageSrc: '/img/worlds.jpg'
                },
                { 
                  title: '💬 Rooms', 
                  description: 'Spaces for conversation, like channels or DMs.',
                  link: '/docs/core/rooms',
                  imageSrc: '/img/rooms.jpg'
                },
                { 
                  title: '👤 Entities', 
                  description: 'Represents users, bots, and other participants.',
                  link: '/docs/core/entities',
                  imageSrc: '/img/entities.jpg'
                },
              ]}
            />
            <ComponentSection
              title="Development & Integration"
              items={[
                { 
                  title: '🧠 Knowledge', 
                  description: 'RAG system for document processing and semantic memory.',
                  link: '/docs/core/knowledge',
                  imageSrc: '/img/knowledge.jpg'
                },
                { 
                  title: '📝 Projects', 
                  description: 'Defines and deploys agents with configurations.',
                  link: '/docs/core/project',
                  imageSrc: '/img/project.jpg'
                },
                { 
                  title: '📋 Tasks', 
                  description: 'Manages scheduled and deferred operations.',
                  link: '/docs/core/tasks',
                  imageSrc: '/img/tasks.jpg'
                },
              ]}
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Learn More About ElizaOS</h2>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link
                href="/docs/intro"
                style={{
                  padding: '12px 24px',
                  background: '#ff9500',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  display: 'inline-block',
                }}
              >
                Explore Documentation
              </Link>
              <a
                href="https://calendar.google.com/calendar/embed?src=c_ed31cea342d3e2236f549161e6446c3e407e5625ee7a355c0153befc7a602e7f%40group.calendar.google.com&ctz=America%2FToronto"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px 24px',
                  border: '1px solid #ff9500',
                  color: '#ff9500',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
                </svg>
                View Calendar
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <DailyNews />
    </main>
  );
}

function ActionCard({ title, description, imageSrc, primaryLink, primaryText, secondaryLink, secondaryText, secondaryIcon = "📋", external = false }: any) {
  const LinkComponent = external ? 'a' : Link;
  const linkProps = external ? { href: primaryLink, target: "_blank", rel: "noopener noreferrer" } : { href: primaryLink };
  const secondaryLinkProps = external ? { href: secondaryLink, target: "_blank", rel: "noopener noreferrer" } : { href: secondaryLink };

  return (
    <div style={{
      padding: '0',
      background: 'var(--fd-background)',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid var(--fd-border)',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        width: '100%',
        height: '200px',
        overflow: 'hidden'
      }}>
        <img 
          src={imageSrc}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>
      <div style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{title}</h3>
        <p style={{ color: 'var(--fd-muted-foreground)', marginBottom: '1.5rem' }}>{description}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <LinkComponent
            {...linkProps}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #ff9500 0%, #ff7700 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {primaryText}
          </LinkComponent>
          <LinkComponent
            {...secondaryLinkProps}
            style={{
              padding: '10px 20px',
              color: '#ff9500',
              textDecoration: 'none',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            {secondaryIcon} {secondaryText}
          </LinkComponent>
        </div>
      </div>
    </div>
  );
}

function ComponentSection({ title, items }: any) {
  return (
    <div>
      <h3 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {items.map((item: any, i: number) => (
          <Link
            key={i}
            href={item.link}
            style={{
              background: 'var(--fd-background)',
              borderRadius: '8px',
              border: '1px solid var(--fd-border)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s',
              display: 'block',
              overflow: 'hidden'
            }}
          >
            <div style={{
              width: '100%',
              height: '150px',
              overflow: 'hidden'
            }}>
              <img 
                src={item.imageSrc}
                alt={item.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
            <div style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.title}</h4>
              <p style={{ color: 'var(--fd-muted-foreground)', margin: 0 }}>{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DailyNews() {
  // This is a simplified version of the news component
  // In a real implementation, you'd want to add the full functionality
  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '2.5rem' }}>News</h2>
          <Link
            href="/news"
            style={{
              padding: '10px 20px',
              border: '1px solid var(--fd-border)',
              color: 'var(--fd-foreground)',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 500,
            }}
          >
            View All
          </Link>
        </div>
        <div style={{
          padding: '2rem',
          background: 'var(--fd-muted)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--fd-muted-foreground)' }}>
            News feed will load here. Visit{' '}
            <Link href="/news" style={{ color: '#ff9500' }}>the news page</Link>{' '}
            for the latest updates.
          </p>
        </div>
      </div>
    </section>
  );
}